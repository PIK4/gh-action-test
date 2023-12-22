/**
 * @param {IDBRequest} request
 */
function deferred(request) {
    return new Promise((resolve, reject) => {
        if (request instanceof IDBRequest) {
            if (request.readyState === 'done') {
                if (request.error) reject(request.error)
                if (request.result) resolve(request.result)
            } else {
                request.onerror = e => reject(e.target.error)
                request.onsuccess = e => resolve(e.target.result)
            }
        } else {
            return resolve(request)
        }
    })
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 */
export default new Proxy(
    class DB {

        /**
         * @type {IDBDatabase}
         */
        #db
        /**
         * @type {EventTarget}
         */
        #dispatcher

        #name
        #version
        #migration

        /**
         * 
         * @param {String} name database name
         * @param {Number} version integer
         * @param {(db: IDBDatabase) => void} migration 
         */
        constructor(name, version, migration = db => { }) {
            this.#name = name
            this.#version = version
            this.#migration = migration
            this.#bootstrap()
        }

        async #bootstrap() {
            this.#db = await this.#connect({
                db_name: this.#name,
                db_version: this.#version,
                onupgradeneeded: ({ target: { result } }) => this.#migration(result)
            })

            this.store = new Proxy(this.store, {
                get: (target, property) => Reflect.apply(target, this, [property])
            })

            this.#dispatcher = new EventTarget()
        }

        #connect(db_name, db_version = 1, onupgradeneeded = e => { }) {
            const request = window.indexedDB.open(db_name, db_version)
            request.addEventListener('upgradeneeded', onupgradeneeded)
            return deferred(request)
        }

        /**
         * 
         * @param {IDBDatabase} db 
         * @param {String} store_name 
         * @param {String|'readonly'|'readwrite'} mode 
         * @returns {IDBTransaction}
         */
        getTransaction(store_name, mode = 'readonly') {
            return this.#db.transaction(store_name, mode)
        }

        /**
         * 
         * @param {String} store_name 
         * @param {'readonly'|'readwrite'} mode 
         * @returns {IDBObjectStore}
         */
        getStore(store_name, mode = 'readonly') {
            return this.getTransaction(store_name, mode).objectStore(store_name)
        }

        /**
         * 
         * @param {String} store_name 
         * @returns {Proxy<IDBObjectStore>}
         */
        store(store_name) {
            return new Proxy(this.getStore(store_name, 'readonly'), {
                get: (target, property) => {
                    if (typeof target[property] == 'function') {

                        if (['add', 'put', 'delete', 'deleteIndex', 'clear'].includes(property)) {
                            target = this.getStore(store_name, 'readwrite')
                        }

                        this.#dispatcher.dispatchEvent(new CustomEvent(`${store_name}.${property}`, { target }))

                        return (...args) => deferred(Reflect.apply(target[property], target, args))
                    }

                    return target[property]
                }
            }
            )
        }
    },
    {
        get(target, property) {
            if(!Reflect.has(target, property)){
                return Reflect.apply(target.__call)
            }
        }
    }
)
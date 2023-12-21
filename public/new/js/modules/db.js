/**
 * @param {IDBRequest} request
 */
function deferred(request) {
    return new Promise((resolve, reject) => {
        if (request.readyState === 'done') {
            if (request.error) reject(request.error)
            if (request.result) resolve(request.result)
        } else {
            request.onsuccess = e => resolve(e.target.result)
            request.onerror = e => reject(e.target.error)
        }
    })
}

export default class DB {

    /**
     * @type {IDBDatabase}
     */
    #db

    /**
     * 
     * @param {String} name database name
     * @param {Number} version integer
     * @param {String[]} stores
     * @param {(db: IDBDatabase) => void} migration 
     */
    constructor(name, version = 1, migration = db => { }) {
        this.#db = this.#connect({
            db_name: name,
            db_version: version,
            onupgradeneeded: ({ target: { result } }) => migration(result)
        })
    }

    async #connect(db_name, db_version = 1, onupgradeneeded = e => { }) {
        const request_open = window.indexedDB.open(db_name, db_version)
        request_open.addEventListener('upgradeneeded', onupgradeneeded)
        return await deferred(request_open)
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
     * @param {String|'readonly'|'readwrite'} mode 
     * @returns {IDBObjectStore}
     */
    getStore(store_name, mode = 'readonly') {
        return this.getTransaction(store_name, mode).objectStore(store_name)
    }
}

import DB from "./modules/db"

const DB_NAME = 'app'
const DB_VERSION = 1

class App {
    /**
     * @type {DB}
     */
    #db

    /**
     * @type {Window}
     */
    #global

    /**
     * 
     */
    constructor() {
        this.#bootstrap()
    }

    #bootstrap() {
        this.#db = this.#dbFactory(DB_NAME, DB_VERSION)
    }

    #dbFactory(name, version) {
        return new DB(
            name,
            version,
            db => {
                console.log(`Setup DB version: ${db.version}`)

                // Create `rss` Data Store
                const objectStore = db.createObjectStore('rss', { autoIncrement: true })
                // indexes
                objectStore.createIndex('title', 'title', { unique: true })
                objectStore.createIndex('reference', 'reference', { unique: false })
                objectStore.createIndex('publish_at', 'publish_at', { unique: false })
                objectStore.createIndex('resource_type', 'resource_type', { unique: false })
            }
        )
    }

    /**
     * 
     * @param {Window} global
     */
    mount(global) {
        this.#global = global
    }
}


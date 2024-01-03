/**
 * 
 * @typedef {Object} App 
 * @property {(name: String|'show-name') => Promise<EpisodeInfo[]>} fetchEpisodeInfo
 * 
 * 
 * @typedef {Object} EpisodeInfo
 * @property {String} title
 * @property {Date} publish_at
 * @property {String} reference
 * @property {String} resource_type
 * @property {String} url
 * 
 */

window.app = (() => {
    /**
     * Settings
     */

    const shows = new Map([
        ['soso no frieren', 'https://raw.githubusercontent.com/PIK4/gh-action-test/main/rss/soso_no_frieren.rss.xml'],
        ['jujutsu kaisen', 'https://raw.githubusercontent.com/PIK4/gh-action-test/main/rss/jujutsu_kaisen.rss.xml'],
        ['spy x framily s02', 'https://raw.githubusercontent.com/PIK4/gh-action-test/main/rss/spy_family_s02.rss.xml'],
    ])
    const rssCache = new Map()

    // select-all button element
    const elSelectAll = document.querySelector('#select-all')
    // reverse-selected button element
    const elReverseSelected = document.querySelector('#reverse-selected')
    // copy-selected button element
    const elCopySelected = document.querySelector('#copy-selected')

    // const WATCHED_EPISODE_STORE_KEY = 'watched_episode'
    // const watchedEpisode = new Set(JSON.parse(localStorage.getItem(WATCHED_EPISODE_STORE_KEY)) || [])
    // /**
    //  * @param {Set<String|'episode-name'>} set 
    //  * @returns {void}
    //  */
    // const setWatchedEpisode = set => localStorage.setItem(WATCHED_EPISODE_STORE_KEY, JSON.stringify(Array.from(set)))
    /**
     * @param {String} hash 
     * @returns {[String|'show-name', Set<String|'selected-episode'>]}
     */
    const extractHash = hash => {
        const [show_name = '', selected_episode = ''] = hash.slice(1).split('::')

        return [show_name.replaceAll('_', ' '), new Set(selected_episode.split('-'))]
    }
    /**
     * @param {String} xml 
     * @returns {EpisodeInfo[]}
     */
    const extractXml = xml => {
        const xmlDom = (new DOMParser()).parseFromString(xml, 'text/xml')

        const items = []
        xmlDom.querySelectorAll('item')
            .forEach(i => {
                const enclosure = i.querySelector('enclosure').attributes
                items.push({
                    title: i.querySelector('title').textContent,
                    description: i.querySelector('description').textContent,
                    reference: i.querySelector('link').textContent,
                    publish_at: new Date(i.querySelector('pubDate').textContent),
                    resource_type: enclosure.type.nodeValue,
                    url: enclosure.url.nodeValue
                })
            })

        return items
    }
    /**
     * 
     */
    const renderShows = () => {
        const elShowList = document.querySelector('#show-list')

        const elA = document.createElement('a')
        elA.classList.add('button')
        elA.setAttribute('href', '#')
        elA.innerText = '#'
        elShowList.appendChild(elA)

        shows.forEach((rss_url, show_name) => {
            const ref_name = show_name.replaceAll(' ', '_')
            const elA = document.createElement('a')
            elA.classList.add('button')
            elA.setAttribute('href', `#${ref_name}`)
            elA.setAttribute('data-rss', rss_url)
            elA.innerText = `#${ref_name}`

            elShowList.appendChild(elA)
        })
    }
    /**
     * episodes loader
     */
    const loadEpisodes = (() => {
        const elContent = document.querySelector('#content')
        const elTemplate = document.querySelector('#episode-info').content
        const elSection = elTemplate.querySelector('.episode-info')
        const elTitle = elSection.querySelector('.title')
        const elCheckbox = elSection.querySelector('input[type=checkbox]')
        const elResourceType = elSection.querySelector('.resource-type')
        const elResourceUrl = elSection.querySelector('.resource-url')

        return async () => {
            const [show_name, selected_episode] = extractHash(location.hash)
            if (!show_name) return elContent.replaceChildren('')

            elContent.replaceChildren(`loading [${show_name}] ..`)
            const episodes = await app.fetchEpisodeInfo(show_name)
            elContent.replaceChildren('')

            episodes.forEach((info, index) => {
                elSection.dataset.id = index
                elSection.dataset.name = show_name

                elTitle.textContent = info.title
                elResourceType.textContent = info.resource_type
                elResourceUrl.textContent = info.url

                elCheckbox.checked = selected_episode.has(index.toString())

                let cloneNode = document.importNode(elTemplate, true)

                elContent.appendChild(cloneNode)
            })
        }
    })()

    /**
     * @param {String} text
     */
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text)
            console.log('copyToClipboard', 'ok', text)
        } catch (e) {
            console.log('copyToClipboard', e)
        }
    }

    /** 
     * @type {App} 
     */
    const app = {
        clipboard: '',
        /**
         * @param {String} name
         * @return {Promise<EpisodeInfo[]>}
         */
        async fetchEpisodeInfo(name) {
            let episodes = rssCache.get(name)

            if (!episodes) {
                const rss_url = shows.get(name)

                episodes = await fetch(rss_url)
                    .then(r => r.text())
                    .then(xml => extractXml(xml))

                rssCache.set(name, episodes)
            }

            return episodes
        },
    }

    renderShows()

    loadEpisodes()
    window.addEventListener('hashchange', loadEpisodes)

    let elEpisodeInfoSelectedCount = 0
    setInterval(async () => {
        const elEpisodeInfoSelected = document.querySelectorAll('.episode-info:has(:checked)')
        if (elEpisodeInfoSelectedCount === elEpisodeInfoSelected.length) return;

        elEpisodeInfoSelectedCount = elEpisodeInfoSelected.length


        const url = new URL(location)
        let [show_name, selected_episode] = extractHash(location.hash)

        const hash_show_name = show_name.replaceAll(' ', '_')
        const hash_selected_episode = [...elEpisodeInfoSelected.entries()].map(([i, e]) => e.dataset.id).join('-')
        url.hash = `#${hash_show_name}${hash_selected_episode ? '::' + hash_selected_episode : ''}`

        history.pushState({}, null, url)


        const episodes = await app.fetchEpisodeInfo(show_name)
        let clipboard = ''
        selected_episode.forEach((_, id) => {
            clipboard += episodes[id].url + '\n'
        })
        app.clipboard = clipboard
    })

    elSelectAll.addEventListener('click', () => {
        document.querySelectorAll('.episode-info').forEach(e => e.querySelector('input[type=checkbox]').checked = true)
    })

    elReverseSelected.addEventListener('click', () => {
        document.querySelectorAll('.episode-info').forEach(e => {
            let elCheckbox = e.querySelector('input[type=checkbox]')
            elCheckbox.checked = !elCheckbox.checked
        })
    })

    elCopySelected.addEventListener('click', e => {
        copyToClipboard(app.clipboard)
    })

    return app
})()
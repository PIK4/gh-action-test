/**
 * 
 * @typedef {Object} App 
 * @property {Map<String|'show-name',String|'rss-url'>} shows
 * @property {Map<String|'episode-name',EpisodeInfo>} cache
 * @property {Map<String|'selected-id',EpisodeInfo>} selected
 * @property {Set<String|'episode-name'>} watchedEpisode
 * @property {(title: String, add: Boolean) => void} updateWatchedEpisode
 * @property {Boolean} useCustomElement
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
    const selected = new Map()
    const WATCHED_EPISODE_STORE_KEY = 'watched_episode'
    const watchedEpisode = new Set(JSON.parse(localStorage.getItem(WATCHED_EPISODE_STORE_KEY)) || [])

    /** 
     * @type {App} 
     */
    const app = {
        updateWatchedEpisode({dataset: {title = '', watched = 'false'}} = {}) {
            if(!title) return;

            watched === 'false' ? watchedEpisode.add(title) : watchedEpisode.delete(title)

            localStorage.setItem(WATCHED_EPISODE_STORE_KEY, JSON.stringify(Array.from(watchedEpisode)))
        },
    }



    const FlipBooleanString = { 'true': 'false', 'false': 'true' }
    // main content element
    const elMainContent = document.querySelector('#content')
    // shows-selector element
    const elShowSelector = document.querySelector('#shows-selector select')
    // select-all button element
    const elSelectAll = document.querySelector('#select-all')
    // select-all button element
    const elReverseSelected = document.querySelector('#reverse-selected')
    // select-all button element
    const elCopySelected = document.querySelector('#copy-selected')

    /**
     * Page Setup
     */

    // setup shows-selector
    let options = '<option value="">-- Select Show --</option>'
    for (const [name] of shows) {
        options += `<option value="${name}">${name}</option>`
    }
    elShowSelector.innerHTML = options
    // listen shows-selector change event
    elShowSelector.addEventListener('change', async e => {
        const { target: { value: name } } = e
        // clear selected
        app.selected.clear()

        if (app.shows.has(name)) {
            elMainContent.innerHTML = `Loading "${name}" Episodes Resource ...`

            const episodes = await fetchEpisodeInfo(name)
            elMainContent.innerHTML = episodes.reduce(
                (s, info, id) => s + templateEpisodeInfo(name, info, id),
                ''
            )
        } else {
            elMainContent.innerHTML = ''
        }
    })

    // listen selecte-all button click event
    elSelectAll.addEventListener('click', () => {
        document.querySelectorAll('section[data-name]').forEach(
            el => changeSectionSelectState(el, 'true')
        )
    })

    // listen reverse-selected button click event
    elReverseSelected.addEventListener('click', () => {
        document.querySelectorAll('section[data-name]').forEach(
            el => changeSectionSelectState(el, el.dataset.selected === 'true' ? 'false' : 'true')
        )
    })

    // listen copy-selected button click event
    elCopySelected.addEventListener('click', () => {
        let urls = ''
        for (const [id, info] of app.selected) {
            urls += info.url + '\n'
        }
        copyToClipboard(urls)
    })
    // listen Shortcut to trigger copy-selected event
    window.addEventListener('keydown', e => {
        if (e.ctrlKey && e.code === 'KeyC') {
            elCopySelected.click()
        }
    })
    elCopySelected.setAttribute('title', 'Or Just Use Shortcut: `Ctrl + C`')

    // observe main content mutation
    new MutationObserver(mutations => mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                // except SECTION element
                if (node.nodeName !== 'SECTION') return;

                listenSectionSelection(node)
                listenSectionCopyButton(node)
                listenSectionWatchBadge(node)
            })
        }
    })).observe(elMainContent, { childList: true })

    /**
     * Define Functions
     */

    /**
     * listen episode-info-section click event
     * @param {HTMLElement} elSection 
     */
    function listenSectionSelection(elSection) {
        const elNoSelects = elSection.querySelectorAll('.no-select')
        elSection.addEventListener('click', async e => {
            const { target } = e
            // except no-select class elements inside click event
            for (const el of elNoSelects) {
                if (el.contains(target)) return;
            }
            // filp select state
            changeSectionSelectState(elSection)
        })
    }
    /**
     *  listen inside copy-button click event
     * @param {HTMLElement} elSection 
     */
    function listenSectionCopyButton(elSection) {
        elSection.querySelectorAll('button[data-copy]').forEach(
            elCopyButton => elCopyButton.addEventListener('click', () => copyToClipboard(elCopyButton.dataset.copy))
        )
    }
    /**
     * @param {HTMLElement} elSection 
     */
    async function listenSectionWatchBadge(elSection) {
        const { dataset: { name, id } } = elSection
        const episode_info = (await fetchEpisodeInfo(name))[Number(id)]

        if (app.watchedEpisode.has(episode_info.title)) {
            elSection.dataset.watched = 'true'
        }

        elSection.querySelector('.episode-title').addEventListener('click', e => {
            let { dataset: { watched = 'false' } } = elSection

            watched = FlipBooleanString[watched]
            elSection.dataset.watched = watched

            app.updateWatchedEpisode(episode_info.title, watched === 'true')
        })
    }

    /**
     * @param {HTMLElement} elSection
     * @param {'false'|'true'|'flip'} state
     */
    async function changeSectionSelectState(elSection, state = 'flip') {
        const { dataset: { name, id, selected } } = elSection
        const episodes = await fetchEpisodeInfo(name)

        state = state === 'flip' ? FlipBooleanString[selected || 'false'] : state
        elSection.dataset.selected = state

        if (state === 'true') {
            app.selected.set(id, episodes[id])
        } else {
            app.selected.delete(id)
        }
    }

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
     * @param {String} name
     * @return {Promise<EpisodeInfo[]>}
     */
    async function fetchEpisodeInfo(name) {
        if (!app.cache.get(name)) {
            const episodes = await fetch(app.shows.get(name)).then(r => r.text()).then(xmlText => {
                const xmlDom = (new DOMParser()).parseFromString(xmlText, 'text/xml')

                const items = []
                xmlDom.querySelectorAll('item').forEach(i => {
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
            })
            app.cache.set(name, episodes)
        }

        return app.cache.get(name)
    }

    /**
     * @param {String} name
     * @param {EpisodeInfo} info
     * @param {Number} index
     */
    function templateEpisodeInfo(name, info, index) {
        return `
            <section data-name="${name}" data-id="${index}">
                <dl>
                    <dt>Title</dt>
                    <dd class="episode-title no-select">${info.title}</dd>
                    ${app.useEpisodeDescription ? `
                        <dt>Description</dt>
                        <dd>
                            <div class="episode-description no-select">
                                <details>
                                    <summary>view</summary>
                                    ${info.description}
                                </details>
                            </div>
                        </dd>
                        ` : ''}
                    <dt>Publish at</dt>
                    <dd>${info.publish_at.toLocaleString()}</dd>
                    <dt>Reference</dt>
                    <dd><cite><a href="${info.reference}">${new URL(info.reference).host}</a></cite></dd>
                    <dt>URL</dt>
                    <dd>
                        <div class="resource-url no-select">
                            <button title="Click To Copy!" data-copy="${info.url}">copy</button>
                            <details>
                                <summary><code>${info.resource_type}</code></summary>
                                <code>${info.url}</code>
                            </details>
                        </div>
                    </dd>
                </dl>
            </section>`
    }

    /**
     * Define Elements
     */

    if (app.useCustomElement) {
        // x-dropdown-list
        customElements.define(
            'x-dropdown-list',
            class extends HTMLElement {
                constructor() {
                    super()
                    console.log("[x-dropdown-list] constructor: created")

                    this._internal = this.attachInternals()
                    this.attachShadow({ mode: 'open' })

                    this.bootstrap()
                }

                connectedCallback() {
                    const flip = { 'true': 'false', 'false': 'true' }
                    this.getOptionElements().forEach(
                        el => el.addEventListener('click', () => {
                            let { dataset: { name, actived = 'false' } } = el

                            this.getOptionElements().forEach(i => i.dataset.actived = 'false')
                            el.dataset.actived = flip[actived]

                            this.getMainElement().innerText = name

                            const elSelect = this.getSelectElement()
                            elSelect.value = name
                            elSelect.dispatchEvent(new Event('change'))
                        })
                    )
                }

                getOptionElements() {
                    if (!this.elOptions) {
                        this.elOptions = this.shadowRoot.querySelectorAll('[data-value]')
                    }
                    return this.elOptions
                }

                getMainElement() {
                    if (!this.elMain) {
                        this.elMain = this.shadowRoot.querySelector('main')
                    }
                    return this.elMain
                }

                getDropdownElement() {
                    if (!this.elDropdown) {
                        this.elDropdown = this.shadowRoot.querySelector('#dropdown-list')
                    }
                    return this.elDropdown
                }

                getSelectElement() {
                    if (!this.elSelect) {
                        this.elSelect = this.querySelector('select')
                    }
                    return this.elSelect
                }

                bootstrap() {
                    this.show_dropdown = false
                    this.actived_option = ''
                    this.selector_options = []
                    for (const option of this.querySelectorAll('select option')) {
                        this.selector_options.push({ name: option.textContent, value: option.value })
                    }

                    this.shadowRoot.innerHTML = this.template()

                    this.addEventListener('click', () => {
                        this.show_dropdown = !this.show_dropdown

                        if (this.show_dropdown) {
                            this.getMainElement().classList.add('dropdown-open')
                        } else {
                            this.getMainElement().classList.remove('dropdown-open')
                        }
                    })
                }

                template() {
                    let actived_name = ''
                    let list_items = this.selector_options.map(
                        ({ name, value }) => {
                            let actived = value === this.actived_option
                            if (actived) actived_name = name
                            return `<li data-value="${value}" data-name="${name}" data-actived="${actived}">${name}</li>`
                        }
                    ).join('')

                    return `${this.style()}
                    <main>${actived_name}</main>
                    <div id="dropdown-list">
                        <ul>
                            ${list_items}
                        </ul>
                    </div>
                    `
                }

                style() {
                    return `
                    <style>
                        :host {
                            --global-color: 245 245 245;
                            --global-bg-color: 0 0 0;
                        }

                    </style>`
                }

            }
        )
    }

})()
/**
 * 
 * @typedef {Object} App 
 * @property {Map<String|'show-name',String|'rss-url'>} shows
 * @property {Map<String|'episode-name',EpisodeInfo>} cache
 * @property {Map<String|'selected-id',EpisodeInfo>} selected
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

(() => {
    /**
     * Settings
     */

    /** 
     * @type {App} 
     */
    const app = {
        shows: new Map([
            ['soso no frieren', 'https://raw.githubusercontent.com/PIK4/gh-action-test/main/rss/soso_no_frieren.rss.xml'],
            ['jujutsu kaisen', 'https://raw.githubusercontent.com/PIK4/gh-action-test/main/rss/jujutsu_kaisen.rss.xml'],
            ['spy x framily s02', 'https://raw.githubusercontent.com/PIK4/gh-action-test/main/rss/spy_family_s02.rss.xml'],
        ]),
        cache: new Map(),
        selected: new Map(),
        useCustomElement: new URL(location).searchParams.get('ce') === '0' ? false : true
    }
    window.app = app
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
    for (const [name] of app.shows) {
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
        if(e.ctrlKey && e.code === 'KeyC'){
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
                // resource-url-block element
                const elResourceUrlBlock = node.querySelector('.resource_url')
                // listen episode-info-section click event
                node.addEventListener('click', async e => {
                    const { target } = e
                    // except resource-url-block inside click event
                    if (elResourceUrlBlock.contains(target)) return;
                    // filp select state
                    changeSectionSelectState(node)
                })
                // listen inside copy-button click event
                node.querySelectorAll('button[data-copy]').forEach(
                    elCopyButton => elCopyButton.addEventListener('click', () => copyToClipboard(elCopyButton.dataset.copy))
                )
            })
        }
    })).observe(elMainContent, { childList: true })

    /**
     * Define Functions
     */

    /**
     * @param {HTMLElement} elSection
     * @param {'false'|'true'|'flip'} state
     */
    async function changeSectionSelectState(elSection, state = 'flip') {
        const { dataset: { name, id, selected } } = elSection
        const episodes = await fetchEpisodeInfo(name)

        state = state === 'flip' ? { 'true': 'false', 'false': 'true' }[selected || 'false'] : state
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
                    <dd>${info.title}</dd>
                    <dt>Publish at</dt>
                    <dd>${info.publish_at.toLocaleString()}</dd>
                    <dt>Reference</dt>
                    <dd><cite><a href="${info.reference}">${new URL(info.reference).host}</a></cite></dd>
                    <dt>URL</dt>
                    <dd>
                        <div class="resource_url">
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
                            --global-color: whitesmoke;
                            --global-bg-color: black;
                        }

                        * {
                            margin: 0;
                            padding: 0;
                        }

                        main.dropdown-open ~ #dropdown-list {
                            display: block;
                        }

                        #dropdown-list {
                            display: none;
                            position: relative;
                            width: 0;
                            height: 0;
                        }

                        ul {
                            min-width: max-content;
                            background-color: var(--global-bg-color);
                            color: var(--global-color);
                            border: solid 1px var(--global-color);
                            border-radius: 5px;
                            font-size: 1rem;
                        }

                        li {
                            list-style-type: none;
                            padding: .5rem;
                            cursor: pointer;
                        }

                        li:not(:first-child)[data-actived="true"],
                        li:hover {
                            background-color: var(--global-color);
                            color: var(--global-bg-color);
                        }

                        li:not(:last-child) {
                            border-bottom: solid 1px var(--global-color);
                        }
                    </style>`
                }

            }
        )
    }

})()
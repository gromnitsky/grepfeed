/* global React, ReactDOM, NProgress */

import shellwords from './rollup/shellwords.js'

import * as u from './rollup/u.js'
import * as dom from './dom.js'

function App() {
    let [is_busy, set_is_busy] = React.useState(false)
    let [feed, set_feed] = React.useState()
    let [progress, set_progress] = React.useState({})
    let request = React.useRef()

    async function submit(url, filter) {
        reset()

        set_is_busy(true)
        let su = server_url(url, filter)
        let fetch = dom.fetch(su.toString())
        NProgress.start()
        set_progress({ value: `Loading...`, type: 'info' })
        request.current = fetch.req
        fetch.req.onprogress = evt => {
            let bytes = u.commas(evt.loaded)
            set_progress({
                value: `Loading... ${bytes} B`,
                type: 'info'
            })
        }

        let json
        try {
            json = JSON.parse(await fetch.promise)
            if ( !(json.articles && json.articles.length))
                throw new Error('no matching articles')
            set_progress({})

            su.searchParams.delete('j')
            set_feed({json, url: su.toString()})
        } catch(e) {
            set_progress({ value: e, type: 'error' })
        }

        NProgress.done()
        set_is_busy(false)
    }

    function reset() {
        request.current?.abort()
        set_feed()
        set_progress({})
    }

    function server_url(url, filter) {
        let uu = new URL(document.location.origin)
        uu.pathname = '/api'
        uu.searchParams.set('url', url)
        let argv = filter_parse(filter)
        Object.keys(argv).forEach(k => uu.searchParams.set(k, argv[k]))
        uu.searchParams.set('j', 1)
        return uu
    }

    console.log('App')
    return (
        <>
          <Form submit={submit} reset={reset} is_busy={is_busy} />
          <Progress status={progress} />
          <Feed data={feed} />
        </>
    )
}

function Form(props) {
    let [url, set_url] = React.useState('')
    let [filter, set_filter] = React.useState('')

    let address_bar_update = React.useRef(dom.debounce( (url, filter) => {
        let ab = new URL(document.location)
        ab.searchParams.set('url', url)
        ab.searchParams.set('filter', filter)
        window.history.replaceState(null, null, ab.toString())
    }, 500))

    React.useEffect( () => {    // run only once
        let params = (new URL(document.location)).searchParams
        let url = params.get('url') || ''
        let filter = params.get('filter') || ''
        if (url) props.submit(url, filter)

        set_url(url)
        set_filter(filter)
    }, [])

    React.useEffect(() => address_bar_update.current(url, filter), [url, filter])

    function handle_submit(evt) {
        evt.preventDefault()
        props.submit(url, filter)
    }

    function handle_reset() {
        if (!props.is_busy) {
            set_url('')
            set_filter('')
        }
        props.reset()
    }

    function handle_input(evt) {
        ({
            'url': set_url,
            'filter': set_filter
        })[evt.target.name](evt.target.value)
    }

    console.log('Form props: ', props)
    return (
        <form onSubmit={handle_submit} onReset={handle_reset} >

          <input type='url' placeholder='http://example.com/rss'
                 spellCheck="false" name="url" value={url}
                 onInput={handle_input} disabled={props.is_busy} required />

          <label>
            <details>
              <summary>Filter:</summary>
              <code>[opt] [PATTERN]</code>
              <p>
                All regular shell quoting rules apply.
              </p>
              <ul>
                <li><code>-e</code>&emsp;&emsp;&emsp;&emsp;
                get only articles w/ enclosures</li>
                <li><code>-n NUM</code>&emsp;&emsp;
                number of articles to get</li>
              </ul>

              <p>Filter by:</p>
              <ul>
                <li><code>-d</code>&emsp;&emsp;&emsp;&emsp;
                <code>[-]date[,date]</code></li>
                <li><code>-c</code>&emsp;&emsp;&emsp;&emsp;
                categories</li>
              </ul>

              <p>
                Or/and search for a regexp PATTERN in each rss article
                & print the matching ones. The internal order of the search:
                title, summary, description, author.
              </p>

              <ul>
                <li><code>-v</code>&emsp;&emsp;&emsp;&emsp;
                invert match</li>
              </ul>
            </details>
          </label>

          <input type='search' spellCheck="false" name="filter" value={filter}
                 onInput={handle_input} disabled={props.is_busy} />

          <Minimist filter={filter} />

          <div>
            <input type='submit' disabled={props.is_busy} />&nbsp;
            <input type='reset' />
          </div>

        </form>
    )
}

function filter_parse(filter) {
    let argv = u.opts_parse(shellwords.split(filter || ''))
    return Object.keys(argv).filter(k => /^[endcv_]$/.test(k))
        .reduce( (result, key) => {
            if (argv[key]) result[key] = argv[key]
            return result
        }, {})
}

function Minimist(props) {
    return <p>argv: {JSON.stringify(filter_parse(props.filter), null, 2)}</p>
}

function Progress(props) {
    let klass = 'hidden'
    if (props.status.type === 'error') klass = 'progress-error text-wrap'
    if (props.status.type === 'info') klass = ''

    return (
        <div id="progress" className={klass}>{
            props.status.value ? props.status.value.toString() : ''
        }</div>
    )
}

function Feed(props) {
    let klass = props.data ? '' : 'hidden'
    return (
        <div className={klass}>
          <RssURL url={props.data?.url} />
          <RssMeta data={props.data?.json} />
          <RssArticles data={props.data?.json.articles} />
        </div>
    )
}

function RssURL(props) {
    return (
        <div id="rss_url" className="text-wrap">
          <p><b>New RSS client/podcatcher URL:</b></p>
          <p><a href={props.url} dangerouslySetInnerHTML={{ __html: dom.colourise(props.url) }} /></p>
        </div>
    )
}

let TableRows = function(props) {
    return Object.keys(props.data || {}).map( (name, idx) => {
	let val = props.data[name]
	if (name === '#') return ''
	if (name === 'pubDate') {
	    val = new Date(val).toUTCString()
	} else if (name === 'link') {
	    val = <a href={val}>{val}</a>
	} else if (name === 'description') {
            val = <div dangerouslySetInnerHTML={{__html: val}} />
	} else if (name === 'enclosures') {
	    let li = val.map( (enc, idx) => {
		return (
		    <li key={idx}>
		      <a href={enc.url}>{enc.url}</a> ({enc.type} {u.commas(enc.length)})
		    </li>
		)
	    })
	    val = <ul>{li}</ul>
	} else if (Array.isArray(val)) {
	    val = val.join(', ')
	    if (val.length > 300) val = <details>{val}</details>
	}

	return (
	    <tr key={idx}>
	      <td>{name}</td>
	      <td>{val}</td>
	    </tr>
	)
    })
}

function RssMeta(props) {
    return (
        <table className="meta">
          <colgroup>
            <col style={{width: '20%'}} />
            <col style={{width: '80%'}} />
          </colgroup>
          <thead>
            <th colSpan='2'>Metadata</th>
          </thead>
          <tr>
            <td>matched articles</td>
            <td>{props.data?.articles.length}</td>
          </tr>

          <TableRows data={props.data?.meta} />

        </table>
    )
}

function RssArticles(props) {
    return (props.data || []).map( (article, idx) => {
        let up_visibility = idx === 0 ? 'hidden' : 'visible'
        let down_visibility = idx === props.data.length-1 ? 'hidden' : 'visible'

        let up = <a style={{visibility: up_visibility}} className="nav_btn" href={`#${idx-1}`}>Prev</a>
        let down = <a style={{visibility: down_visibility}} className="nav_btn" href={`#${idx+1}`}>Next</a>
	return (
	    <table key={idx} className="article">
	      <colgroup>
		<col style={{width: '15%'}} />
		<col style={{width: '85%'}} />
	      </colgroup>
	      <thead>
		<th colSpan='2' id={idx}><span className="article__title">{up} <span>#{article['#']}</span> {down}</span></th>
	      </thead>

	      <TableRows data={article} />

	    </table>
	)
    })
}


ReactDOM.render(<App />, document.querySelector('#app'))

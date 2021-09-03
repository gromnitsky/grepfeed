import assert from 'assert'
import * as u from '../lib/u.js'

suite('Utils', function() {

    setup(function() {
    })

    test('opts_parse', function() {
        let r = u.opts_parse([ '-n1', '-d', '2000', '-n2', 'foo', 'bar'])
        assert.deepEqual(r, {
            _: 'foo bar',
            v: false,
            e: false,
            x: false,
            j: false,
            m: false,
            debug: false,
            h: false,
            help: false,
            V: false,
            n: '2',
            d: '2000'
        })
    })

})

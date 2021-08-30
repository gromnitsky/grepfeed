import nodePolyfills from 'rollup-plugin-node-polyfills'
import {nodeResolve} from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default ({
    plugins: [
        nodePolyfills(),
        nodeResolve(),
        commonjs()
    ]
})

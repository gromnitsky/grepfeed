import FeedParser from 'feedparser'
import fs from 'fs/promises'

var feedparser = new FeedParser();

fs.open(process.argv[2]).then( fd => {
    return fd.createReadStream()
}).then( res => {
    res.pipe(feedparser)
}).catch( err => {
    console.error(err)
    process.exit(1)
})

feedparser.on('error', console.error)

feedparser.on('readable', function() {
    let stream = this // `this` is `feedparser`, which is a stream
    let item
    while ( (item = stream.read())) {
        console.log('-----------------')
        console.log(item)
    }
})

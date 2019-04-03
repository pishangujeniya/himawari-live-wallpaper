// The number of times a tile will attempted to be downloaded if the download fails
var retries = 5;

// Known hashes of images that contain "No Image" information
var emptyImages = {
    // '412cfd32c1fdf207f9640a1496351f01': 1,
    'b697574875d3b8eb5dd80e9b2bc9c749': 1
};

var himawari = function (userOptions) {

    var options = extend({
        date: 'latest',
        debug: false,
        infrared: false,
        outfile: null,
        parallel: false,
        skipEmpty: true,
        timeout: 30000, // 30 seconds
        urls: false,
        zoom: 1,
        compress: false,
        success: function () { },
        error: function () { },
        chunk: function () { },
        urls_output: function () { },
    }, userOptions);

    function log() {
        if (options.debug) {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[Himawari]');
            console.log.apply(console, args);
        }
    }

    // The base URL for the Himawari-8 Satellite uploads
    var image_type = options.infrared ? 'INFRARED_FULL' : 'D531106';
    var base_url = 'http://himawari8-dl.nict.go.jp/himawari8/img/' + image_type;

    log('Resolving date...');
    resolveDate(base_url, options.date, function (err, now) {
        if (err) {
            if (err.code === 'ETIMEDOUT') {
                return console.error('Request to Himawari 8 server timed out. Please try again later.');
            } else {
                return console.error(err);
            }
        }

        log('Date resolved', now.toString());

        // Normalize our date
        now.setMinutes(now.getMinutes() - (now.getMinutes() % 10));
        now.setSeconds(0);

        // Define some image parameters
        var width = 550;
        var level = {
            INFRARED_FULL: {
                1: "1d",
                2: "4d",
                3: "8d"
            },
            D531106: {
                1: "1d",
                2: "2d",
                3: "4d",
                4: "8d",
                5: "16d",
                6: "20d"
            }
        }[image_type][options.zoom] || "1d";

        log('Zoom level set to ' + level);

        var blocks = parseInt(level.replace(/[a-zA-Z]/g, ''), 10);

        // Format our url paths
        var time = moment(now).format('HHmmss');
        var year = moment(now).format('YYYY');
        var month = moment(now).format('MM');
        var day = moment(now).format('DD');

        var outfile = options.outfile || './' + [year, month, day, '_', time, '.jpg'].join('');
        var url_base = [base_url, level, width, year, month, day, time].join('/');

        // Compose our requests
        var tiles = [];
        for (var x = 0; x < blocks; x++) {
            for (var y = 0; y < blocks; y++) {
                tile_name = x + '_' + y + '.png';
                tiles.push({
                    url: url_base + '_' + tile_name,
                    name: tile_name,
                    x: x,
                    y: y,
                });
            }
        }
        console.log(tiles);
        // Create a temp directory
        var tmp = mktemp.dirSync({ unsafeCleanup: true });

        // Execute requests
        var count = 1;
        var skipImage = false;
        var flow = options.parallel ? 'each' : 'eachSeries';
        async[flow](tiles, function (tile, cb) {

            if (skipImage) { return cb(); }

            // Attempt to retry downloading image if fails
            async.retry({ times: retries, interval: 500 }, function (inner_cb) {

                // Download images
                var uri = url_base + '_' + tile.name;
                var dest = path.join(tmp.name, tile.name);
                var stream = fs.createWriteStream(dest);
                stream.on('error', function (err) { return inner_cb(err); });
                stream.on('finish', function () { return log('Tile downloaded', uri); });
                stream.on('close', function () {

                    if (options.skipEmpty) {
                        var data = fs.readFileSync(dest);
                        var hash = crypto.createHash('md5').update(data).digest('hex');

                        if (emptyImages[hash]) {
                            log('Skipping empty tile...');
                            skipImage = true;
                            return inner_cb();
                        }
                    }

                    log('Tile saved', dest);

                    // Callback with info
                    options.chunk({
                        chunk: dest,
                        part: count,
                        total: tiles.length
                    });
                    count++;
                    return inner_cb();
                });

                // Pipe image
                log('Requesting image...', uri);

                if (options.urls) {
                    console.log(uri);
                    return inner_cb();
                    // return options.urls_output(uri);
                }

                if (options.compress) {
                    quality = 65;
                    uri = "https://image-compress.herokuapp.com/image-compress.php?secret_key=coffee&image_link=" + encodeURIComponent(uri) + "&quality=" + quality + "&delete_dirs=false&debug_mode=false&want_binary=true";
                }

                request({
                    method: 'GET',
                    uri: uri,
                    timeout: options.timeout // 30 Seconds
                })
                    .on('response', function (res) {
                        if (res.statusCode !== 200) {
                            // Skip other tiles, jump immediately to the outer callback
                            log('Invalid status code');
                            return cb('Invalid status code', res);
                        }
                    })
                    .on('error', function (err) {
                        // This will trigger our async.retry
                        log('Failed to request file');
                        return inner_cb('Failed to request file', err);
                    })

                    // Pipe data to file stream
                    .pipe(stream);

            }, cb);

        }, function (err) {

            if (err) {
                log('Error occurred...', err);
                return options.error(err);
            }

            if (options.urls) {
                return options.success();
            }

            // If we are skipping this image
            if (skipImage) {
                // Clean
                log('No image data, skipping...');
                log('Cleaning temp files...');

                tmp.removeCallback();
                return options.success('No image available');
            }

            // MERGING TILES
            console.log("Generating : " + outfile);
            var min = 9999;
            var max = 99999;
            var random = Math.floor(Math.random() * (+max - +min)) + +min;
            const earth_data_location = path.join(rootPath + "/earth_data/tiles/" + random + "/");
            const FILE_PREFIX = "earth";
            fs.ensureDirSync(earth_data_location)
            fs.emptyDirSync(earth_data_location);
            for (var i = 0; i < tiles.length; i++) {
                var page = tiles[i];
                fs.copyFileSync(path.join(tmp.name, page.name), earth_data_location + FILE_PREFIX + "_" + i + "_" + page.name, (err) => {
                    if (err) { return options.error(err); }
                });
            }

            var earth_data_files = [];
            width = 550;
            fs.readdirSync(earth_data_location).forEach(file => {
                // file : earth_1_0_1.png
                // 1 is index...
                // 0 is x position of that image
                // 1 is y position of that images
                var res = file.split("_");
                earth_data_files.push({
                    "src": earth_data_location + file,
                    "x": width * parseInt(res[2].replace(".png", "")),
                    "y": width * parseInt(res[3].replace(".png", ""))
                });
            });
            x = 0;
            switch (options.zoom) {
                case "6":
                    x = 11000;
                    break;
                case "5":
                    x = 8800;
                    break;
                case "4":
                    x = 4400;
                    break;
                case "3":
                    x = 2200;
                    break;
                case "2":
                    x = 1100;
                    break;
                case "1":
                    x = 550;
                    break;
                default:
                    x = -1;
            }
            if (x != -1) {
                mergeImages(earth_data_files, {
                    width: x,
                    height: x
                })
                    .then(b64 => afterMerge(b64, outfile, x));
            }

            // MERGING TILES.

            // Clean
            try {
                log('Cleaning temp files...');
                tmp.removeCallback();
            }
            catch (err) {
                log('Cleaning Failed...');
                console.log("Cleaning Failed..");
                console.log(err);
            }
            return options.success('File saved to ' + outfile);

        });

    });
};

/**
 * Takes an input, either a date object, a date timestamp, or the string "latest"
 * and resolves to a native Date object.
 * @param  {String|Date}   input    The incoming date or the string "latest"
 * @param  {Function} callback The function to be called when date is resolved
 */
function resolveDate(base_url, input, callback) {

    var date = input;

    // If provided a date string
    if ((typeof input == "string" || typeof input == "number") && input !== "latest") {
        date = new Date(input);
    }

    // If provided a date object
    if (moment.isDate(date)) { return callback(null, date); }

    // If provided "latest"
    else if (input === "latest") {
        var latest = base_url + '/latest.json';
        request({
            method: 'GET',
            uri: latest,
            timeout: 30000
        }, function (err, res) {
            if (err) return callback(err);
            try { date = new Date(JSON.parse(res.body).date); }
            catch (e) { date = new Date(); }
            return callback(null, date);
        });
    }

    // Invalid string provided, return new Date
    else { return callback(null, new Date()); }

}

function afterMerge(b64_data, out_file, width) {
    saveBase64Image(b64_data, out_file);
    makeScreenWallpaper(out_file, width, width, true);
}

function saveBase64Image(b64_data, out_file) {
    var base64Data = b64_data.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync(out_file, base64Data, 'base64', function (err) {
        console.log(err);
    });
}

function makeScreenWallpaper(input_file, input_image_width, input_image_height, is_landscape_image_generate) {
    var dimensions = electron.screen.getPrimaryDisplay().size;

    var SCREEN_WIDTH = dimensions.width;
    var SCREEN_HEIGHT = dimensions.height;
    console.log(SCREEN_WIDTH + "x" + SCREEN_HEIGHT);

    if (is_landscape_image_generate) {
        var new_image_width = parseInt(input_image_width * (SCREEN_WIDTH / SCREEN_HEIGHT));
        var new_image_height = input_image_height;
        console.log("NEW IMAGE WALLPAPER : " + new_image_width + " x " + new_image_height);
        var new_x_position = (new_image_width/2) - (input_image_width/2);
        mergeImages([{
            "src": input_file,
            "x": new_x_position,
            "y": 0
        }], {
                width: new_image_width,
                height: new_image_height
            })
            .then(b64 => saveBase64Image(b64, input_file));
    } else {
        console.log("Will be in future updates, currently only landscape monitors are supported");
    }

}

himawari.resolveDate = resolveDate;
module.exports = himawari;


// CREDITS
// The code is modified as per need from the original author.
// https://github.com/jakiestfu/himawari.js

// Thanks to http://www.jma.go.jp/ & http://www.nict.go.jp/ & https://gist.github.com/MichaelPote/92fa6e65eacf26219022

// Original Licnese

// The MIT License (MIT)

// Copyright (c) 2016 Jacob Kelley

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
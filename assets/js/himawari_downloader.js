class himawari_downloader {

    constructor(all_links, download_directory) {
        this.all_links = all_links;
    }

    initiate_download(use_electron_dl) {
        var links_count = this.all_links.length;
        for (var i = 0; i < links_count; i++) {
            var current_link = this.all_links[i];
            for (var j = 0; j < current_link.length; j++) {
                var path = download_directory + "/" + current_link[j].HH + current_link[j].MM + current_link[j].SS + "/";
                fs.ensureDirSync(path);
                var tpath = path + current_link[j].part_file_name;
                if (use_electron_dl) {
                    this.download_using_electron_dl(current_link[j].url, path, current_link[j].part_file_name);
                } else {
                    this.download_using_fstream(current_link[j].url, tpath);
                }
            }
        }
    }

    download_using_fstream(uri, dest) {
        var stream = fs.createWriteStream(dest);
        stream.on('error', function (err) { return console.log(err); });
        stream.on('finish', function () { return console.log('Part downloaded', uri); });
        stream.on('close', function () { });
        request({
            method: 'GET',
            uri: uri,
            timeout: 30000 // 30 Seconds
        }).on('response', function (res) {
            if (res.statusCode !== 200) {
                // Skip other tiles, jump immediately to the outer callback
                console.log('Invalid status code');
            }
        }).on('error', function (err) {
            // This will trigger our async.retry
            console.log(err);
            console.log('Failed to request file');
        }).pipe(stream);
    }

    download_using_electron_dl(link, directory, file_name) {
        ipcRenderer.send("download", {
            url: link,
            properties: { directory: directory, filename: file_name, saveAs: false }
        });
        ipcRenderer.on("download_progress", (event, status) => {
            console.log(status); // Full file path
        });
        ipcRenderer.on("download_complete", (event, file) => {
            console.log(file); // Full file path
        });
    }

}

module.exports = himawari_downloader;
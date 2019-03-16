var wallpaper = require('wallpaper');
var rootPath = require('electron-root-path').rootPath;
const fs = require('fs-extra')
var path = require('path');
var himawari = require(path.join(rootPath, "/assets/js/himawari_scrapper.js"));
var dateFormat = require('dateformat');

var dates_global = [];
function setWall() {

    var download_start_button = document.getElementById("download_start_button");
    download_start_button.disabled = true;

    var sel1 = document.getElementById('sel1');
    sel1.disabled = true;

    level = sel1.options[sel1.selectedIndex].value;

    var now = new Date();
    now.setMinutes(0);
    now.setSeconds(0);
    now.setHours(0);
    now.setDate(now.getDate() - 2);
    for (var i = 0; i < 24; i++) {
        now.setHours(i);
        for (m = 0; m < 60; m++) {
            if (
                m == 0 ||
                m == 10 ||
                m == 20 ||
                m == 30 ||
                m == 40 ||
                m == 50) {
                now.setMinutes(m);
                yesterday = dateFormat(now, "yyyy-mm-dd HH:MM:ss");
                dates_global.push(yesterday);
            }

        }
    }

    console.log("Himawari Starting...");
    var out_file_path = path.join(rootPath + "/earth_data/walls/");
    fs.ensureDirSync(out_file_path);
    fs.emptyDirSync(out_file_path);

    recursive_fetch_earth(0, dates_global.length);

    (async () => {
        await wallpaper.set(out_file_path);
        // await wallpaper.get();
    })();
}

function recursive_fetch_earth(index, max_index) {
    $(function () {
        $("#dynamic")
            .css("width", ((index / max_index) * 100) + "%")
            .attr("aria-valuenow", index + 1)
            .text(index + 1 + " / " + max_index + " Complete");
    });

    if (index >= max_index) {
        return true;
    }

    date = dates_global[index];
    HH = date.split(" ")[1].split(":")[0];
    MM = date.split(" ")[1].split(":")[1];
    file_name = HH + "_" + MM;
    var out_file_path = path.join(rootPath + "/earth_data/walls/");
    out_file_path = path.join(out_file_path, "earth_" + file_name + ".png");
    // console.log(out_file_path);
    himawari({
        zoom: level,
        date: date, // Or new Date() or a date string //2019-03-16 22:00:00
        debug: false,
        infrared: false,
        outfile: out_file_path,
        parallel: true,
        skipEmpty: true,
        timeout: 30000,
        urls: false,
        success: function () {
            // process.exit();
            recursive_fetch_earth(index + 1, max_index);
        },
        error: function (err) { console.log(err); },
        chunk: function (info) {
            console.log(info.outfile + ': ' + info.part + '/' + info.total);
        }
    });

}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



const ui_cases = {
    start_download: 'start_download',
    stop_download: 'stop_download',
    download_completed: 'download_completed',
    start_wallpaper_service: 'start_wallpaper_service'
}
var DEBUG = true;
var walls_path = path.join(rootPath + "/earth_data/walls/");
var tiles_path = path.join(rootPath + "/earth_data/tiles/");

var dates_global = [];
var stop_download = false;
var start_wallpaper_service = false;
var to_compress = false;
var last_wallpaper_set = undefined;


function start_download_click() {
    stop_download = false;
    UI_UPDATE(ui_cases.start_download);

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

    if (DEBUG) console.log("Himawari Starting...");

    fs.ensureDirSync(walls_path);
    fs.emptyDirSync(walls_path);

    recursive_fetch_earth(0, dates_global.length);
}
function stop_download_click() {
    UI_UPDATE(ui_cases.stop_download);
    stop_download = true;
    dates_global = [];
}
function wallpaper_start_click() {
    UI_UPDATE(ui_cases.start_wallpaper_service);
    level = sel1.options[sel1.selectedIndex].value;
    startWallpaperService(true, level);
}
function wallpaper_stop_exit_click() {
    const remote = require('electron').remote
    let w = remote.getCurrentWindow()
    w.close();
}
function custom_downloader() {
    // This function is not in use
    var now = new Date();
    now.setDate(now.getDate() - 2);
    day = now.getDate();
    console.log(day);
    month = now.getMonth();
    year = now.getFullYear();
    var hlg = new himawari_link_generator();
    all_links = hlg.himawari_generate_day_links(day, month, year, 2, false);
    console.log(all_links);

    var hd = new himawari_downloader(all_links, "./earth_data");
    hd.initiate_download(false);
}

$(document).ready(function () {
    console.log("Document Ready..");

});

function to_compress_switch(event) {
    if ($(event).is(":checked")) {
        // it is checked
        to_compress = true;
    } else {
        to_compress = false;
    }
}

function recursive_fetch_earth(index, max_index) {

    if (index >= max_index) {
        $(function () {
            $("#dynamic_progress_bar")
                .css("width", "100%")
                .attr("aria-valuenow", 100)
                .text("Download Complete");
        });
        // Deleting the /earth_data/tiles/ directory
        fs.ensureDirSync(tiles_path);
        fs.emptyDirSync(tiles_path);
        UI_UPDATE(ui_cases.download_completed);
        return true;
    } else if (stop_download == true) {
        UI_UPDATE(ui_cases.stop_download);
        return false;
    } else if (!stop_download) {
        // Updating UI with Progress
        $(function () {
            $("#dynamic_progress_bar")
                .css("width", ((index / max_index) * 100) + "%")
                .attr("aria-valuenow", index + 1)
                .text(index + 1 + " / " + max_index + " Downloading...");
        });
        date = dates_global[index];
        HH = date.split(" ")[1].split(":")[0];
        MM = date.split(" ")[1].split(":")[1];
        file_name = HH + "_" + MM;

        out_file_path = path.join(walls_path, "earth_" + file_name + ".png");
        himawari({
            zoom: level,
            compress: to_compress,
            date: date, // Or new Date() or a date string //2019-03-16 22:00:00
            debug: false,
            infrared: false,
            outfile: out_file_path,
            parallel: true,
            skipEmpty: false,
            timeout: 30000,
            urls: false,
            urls_output: function (uri) {
                console.log(uri);
            },
            success: function () {
                // process.exit();
                if (!stop_download) {
                    sleep(1000);
                    recursive_fetch_earth(index + 1, max_index);
                }
            },
            error: function (err) { if (DEBUG) console.log("ERR : " + err); },
            chunk: function (info) {
                if (DEBUG) console.log("Chunk Info : " + info.outfile + ': ' + info.part + '/' + info.total);
            }
        });
    }
}

function startWallpaperService(to_start, zoom_level) {
    start_wallpaper_service = to_start;
    downloaded_walls_data = [];
    fs.readdirSync(walls_path).forEach(file_path => {
        var separated = file_path.split("_");
        console.log(separated);
        var data = {
            src: path.join(walls_path, file_path),
            HH: separated[separated.length - 2].replace(".png", ""),
            MM: separated[separated.length - 1].replace(".png", "")
        }
        downloaded_walls_data.push(data);
    });
    console.log(downloaded_walls_data);

    
    timer();
    /** Now Time */
    function timer() {

        var now = new Date();
        HH = now.getHours();
        MM = now.getMinutes();
        ss = now.getSeconds();

        var current_time = document.getElementById('current_time');
        current_time.innerHTML = HH + " : " + MM + " : " + ss;

        if (
            MM == 0 ||
            MM == 10 ||
            MM == 20 ||
            MM == 30 ||
            MM == 40 ||
            MM == 50) {

            for (var i = 0; i < downloaded_walls_data.length; i++) {
                if (downloaded_walls_data[i].MM == MM && downloaded_walls_data[i].HH == HH) {
                    if (last_wallpaper_set != downloaded_walls_data[i]) {
                        console.log("Set Wallpaper : ");
                        console.log(downloaded_walls_data[i]);
                        last_wallpaper_set = downloaded_walls_data[i];
                        (async () => {
                            await wallpaper.set(downloaded_walls_data[i].src);
                            // await wallpaper.get();
                        })();
                    }
                }
            }

        }

        setTimeout(() => {
            timer()
        }, 1000)
    }

}

function UI_UPDATE(ui_case) {
    switch (ui_case) {
        case ui_cases.start_download:
            if (DEBUG) console.log(ui_case);
            $('#sel1').prop('disabled', true);
            $("#dynamic_progress_bar").text("Download Starting...");
            $('#download_start_button').css('display', 'none');
            $('#download_stop_button').css('display', 'block');
            break;
        case ui_cases.stop_download:
            if (DEBUG) console.log(ui_case);
            $('#sel1').prop('disabled', false);
            $("#dynamic_progress_bar").text("Download Stopped");
            $('#download_start_button').css('display', 'block');
            $('#download_stop_button').css('display', 'none');
            break;
        case ui_cases.download_completed:
            if (DEBUG) console.log(ui_case);
            $('#sel1').prop('disabled', false);
            $("#dynamic_progress_bar").text("Download Completed");
            $('#download_start_button').css('display', 'block');
            $('#download_stop_button').css('display', 'none');
            break;
        case ui_cases.start_wallpaper_service:
            if (DEBUG) console.log(ui_case);
            $('#wallpaper_start_button').prop('disabled', true);
        default:
            if (DEBUG) console.log("UI UPDATE : Invalid ui_case");
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}




var fs = require('fs-extra');
var path = require('path');
var { ipcRenderer } = require("electron");
var wallpaper = require('wallpaper');
var rootPath = require('electron-root-path').rootPath;
var path = require('path');
var himawari = require(path.join(rootPath, "/assets/js/himawari_scrapper.js"));
var dateFormat = require('dateformat');
var $ = require('jquery');
var async = require('async');
var crypto = require('crypto');
var extend = require('deep-extend');
var moment = require('moment');
var request = require('request');
var mktemp = require('tmp');
var mergeImages = require('merge-images');
var electron = require('electron');
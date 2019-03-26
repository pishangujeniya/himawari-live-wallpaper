class himawari_link_generator {
    constructor() {
    }

    himawari_generate_parts_links(HH, MM, SS, day, month, year, depth, infrared) {
         //Adding Leading zeros
        day = "00000" + day.toString();
        day = day.slice(-2);
        month = "00000" + month.toString();
        month = month.slice(-2);
        year = "00020" + year.toString().slice(-2);
        year = year.slice(-4);
        HH = "000000" + HH;
        HH = HH.slice(-2);
        MM = "000000" + MM;
        MM = MM.slice(-2);
        SS = "00";

        var width = 550;
        var image_type = infrared ? 'INFRARED_FULL' : 'D531106';
        var root_domain = 'http://himawari8-dl.nict.go.jp/himawari8/img/' + image_type;
        depth = depth.toString().replace('d', "");
        var main_url = [root_domain, depth + "d", width, year, month, day, HH + MM + SS].join('/');
        // console.log("main url " + main_url);

        var parts = [];
        for (var x = 0; x < depth; x++) {
            for (var y = 0; y < depth; y++) {
                var part_file_name = x + '_' + y + '.png';
                
                parts.push({
                    url: main_url + '_' + part_file_name,
                    part_file_name: part_file_name,
                    x: x,
                    y: y,
                    HH: HH,
                    MM: MM,
                    SS: SS,
                    day: day,
                    month: month,
                    year: year,
                });
                
            }
        }      
        return parts;
    }

    himawari_generate_day_links(day, month, year, depth, infrared) {
        //Adding Leading Zeros 
        day = "00000" + day.toString();
        day = day.slice(-2);
        month = "00000" + month.toString();
        month = month.slice(-2);
        year = "00020" + year.toString().slice(-2);
        year = year.slice(-4);

        var day_links = [];
        var all_minutes = [0, 10, 20, 30, 40, 50];

        for (var i = 0; i < 24; i++) {
            for (var m = 0; m < all_minutes.length; m++) {
                var HH = "000000" + i.toString();
                HH = HH.slice(-2);
                var MM = "000000" + all_minutes[m];
                MM = MM.slice(-2);
                var SS = "00";
                var parts = this.himawari_generate_parts_links(HH, MM, SS, day, month, year, depth, infrared);
                day_links.push(parts);
            }
        }

        return day_links;
    }

}

module.exports = himawari_link_generator;


var debug = true;
var ready = false;
var v = "1.0.4";
var daoc = {};
var spells = [];
var styles = [];
var icons = [];
var objects = [];
var classes = {};
var newicons = false;

var p = ((getparam("p") || "1") * 1) - 1;
var s = getparam("s") || "";
var r = (getparam("r") || "0") * 1;
var c = (getparam("c") || "0") * 1;
var t = (getparam("t") || "0");
var m = (getparam("m") || "db");
var item_id = (getparam("id") || "0") * 1;
var market_id = (getparam("mid") || "0") * 1;
var mob_id = (getparam("mob") || "0") * 1;
var merchant_id = (getparam("merchant") || "0") * 1;
var quest_id = (getparam("quest") || "0") * 1;
var otd_id = (getparam("otd") || "0") * 1;
var source = "all";
var filters = {};
var items_cache = {};
var current_item = null;
var current_market_invid = null;
var current_market_lot = null;
var current_market_price = null;
var current_market_fee = 20;
var market_cache = {};

var max_page = 1;

$(document).on("mousedown", function (e1) {
    if (e1.which === 2) {
        $(document).one("mouseup", function (e2) {
            if (e1.target === e2.target) {
                var e3 = $.event.fix(e2);
                e3.type = "middleclick";
                $(e2.target).trigger(e3);
            }
        });
    }
});


$(document).ready(function () {
    let viewport = $("meta[name='viewport']");
    if (screen.width <= 360) {
        viewport.attr("content", "width=360, initial-scale=0.20");
    } else if (screen.width <= 400) {
        viewport.attr("content", "width=400, initial-scale=0.25");
    } else if (screen.width <= 560) {
        viewport.attr("content", "width=560, initial-scale=0.30");
    } else if (screen.width <= 800) {
        viewport.attr("content", "width=800, initial-scale=0.35");
    } else {
        viewport.attr("content", "width=device-width, initial-scale=1");
    }
    if (debug) console.log("screen.width", screen.width);

    $("#hidder").click(function () {
        if (messagebox_timer !== null)
            clearTimeout(messagebox_timer);
        $("#hidder").fadeOut();
    });

    newicons = Cookies.get("items_newicons", false);
    $("#toggle_icons").click(function () {
        newicons = !newicons;
        if (Cookies) {
            Cookies.set("items_newicons", newicons);
        }
        build_page();
    });

    if (m === "market") {
        $("#mode_db").removeClass("selected");
        $("#mode_market").addClass("selected");
    } else {
        $("#mode_db").addClass("selected");
        $("#mode_market").removeClass("selected");
    }

    $("#market_decline").click(function () {
        $("#market_hidder").hide();
    });
    $("#market_accept").click(function () {
        let url = "itm/market_buyitem.php?id=" + current_market_invid + "&lot=" + current_market_lot + "&price=" + current_market_price;
        if (debug) console.log(url);
        $.get(url, function (result) {
            if (debug) console.log("market_buyitem", result);
            //messagebox_show("Transaction result: <b>" + result + "</b>.");
            //$("#market_item_" + current_market_invid).hide();

            $("#market_buttons").hide();
            if (result === "success") {
                $("#market_message").css({ "color": "#88FF88" }).html("Operation was successful!");
            } else {
                $("#market_message").css({ "color": "#FF8888" }).html("An error occurred:<br/><br/>" + result);
            }
            $("#market_result").show();
            setTimeout(function () {
                $("#market_hidder").hide();
                $("#market_buttons").show();
                $("#market_result").hide();
                $("#market_message").html("");
                market_id = 0;
                build_page();
            }, 3000);
        });
        //$("#market_hidder").hide();
    });
    if (window.history && window.history.pushState) {
        $(window).on("popstate", function (e) {
            if (debug) console.log("popState", location.search);
            p = ((getparam("p") || "1") * 1) - 1;
            s = getparam("s") || "";
            r = (getparam("r") || "0") * 1;
            c = (getparam("c") || "0") * 1;
            t = (getparam("t") || "0");
            m = (getparam("m") || "db");
            item_id = (getparam("id") || "0") * 1;
            market_id = (getparam("mid") || "0") * 1;
            mob_id = (getparam("mob") || "0") * 1;
            merchant_id = (getparam("merchant") || "0") * 1;
            quest_id = (getparam("quest") || "0") * 1;
            otd_id = (getparam("otd") || "0") * 1;
            filters = {};
            for (let f = 0; f < 10; f++) {
                let filter = getparam("f" + f);
                if (filter) {
                    let strpos = filter.indexOf("-");
                    //let spl = filter.split("-");
                    filters[filter.substring(0, strpos)] = filter.substring(strpos + 1);
                    //buildFilter(filter);
                }
            }
            items_cache = {};
            market_cache = {};
            build_page();
        });
    }

    $("#content").html("<br/><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"width: 100%;\"><tr><td class=\"center\" style=\"padding: 10px;\"><div class=\"triple-spinner\"></div><div class=\"wait\" style=\"padding: 20px;\">Please wait while fetching data</div></td></tr></table>");

    if (s !== "") {
        $("#search").val(s).addClass("focused");
    }

    $("#search").focus(function () {
        let val = $(this).val();
        if (val === "Search by name") {
            $(this).val("").addClass("focused");
        }
    });
    $("#search").focusout(function () {
        let val = $(this).val();
        if (val === "") {
            s = "";
            $(this).val("Search by name").removeClass("focused");
        }
    });
    $("#select_realm").change(function () {
        r = $(this).val();
        $("#select_realm_img").attr("src", "hrald/img/" + formatRealm(r).toLowerCase() + "_logo.png");
        let cls = $("#select_cls").val();
        if (cls != 0 && r != 0 && classes[cls].realm != r) {
            $("#select_cls").val("0").change();
        } else update_slots();
        if (ready) update_url();
    });

    let update_slots = function () {
        let html = "<option value=\"0\">Any</option>";

        html += "<option disabled=\"disabled\" style=\"font-style: italic;\">&darr; Jewelry &darr;</option>";
        html += "<option value=\"41-26\">Cloak</option>";
        html += "<option value=\"41-37\">Mythirian</option>";
        html += "<option value=\"41-29\">Necklace</option>";
        html += "<option value=\"41-24\">Jewel</option>";
        html += "<option value=\"41-32\">Belt</option>";
        html += "<option value=\"41-33\">Bracer</option>";
        html += "<option value=\"41-35\">Ring</option>";

        let cls_armor = 0;
        let armor = "";
        if (c != 0) {
            cls_armor = classes[c].armor;
            armor = daoc.objects[cls_armor] + ": ";
        }
        html += "<option disabled=\"disabled\" style=\"font-style: italic;\">&darr; Armor &darr;</option>";
        html += "<option value=\"" + cls_armor + "-21\">" + armor + "Helm</option>";
        html += "<option value=\"" + cls_armor + "-28\">" + armor + "Arms</option>";
        html += "<option value=\"" + cls_armor + "-22\">" + armor + "Gloves</option>";
        html += "<option value=\"" + cls_armor + "-25\">" + armor + "Chest</option>";
        html += "<option value=\"" + cls_armor + "-27\">" + armor + "Legs</option>";
        html += "<option value=\"" + cls_armor + "-23\">" + armor + "Boots</option>";

        html += "<option disabled=\"disabled\" style=\"font-style: italic;\">&darr; Weapons &darr;</option>";
        let weapons = [];
        if (c == 0) {
            switch (r * 1) {
                case 0: weapons = [2, 3, 4, 6, 7, 10, 24, 11, 12, 13, 14, 16, 17, 25, 19, 20, 21, 22, 23, 26, 42, 45, 8, 9, 15, 18, 5]; break;
                case 1: weapons = [2, 3, 4, 6, 7, 10, 24, 42, 45, 8, 9, 15, 18, 5]; break;
                case 2: weapons = [11, 12, 13, 14, 16, 17, 25, 42, 8, 9, 15, 18]; break;
                case 3: weapons = [19, 20, 21, 22, 23, 26, 42, 45, 8, 9, 15, 18, 5]; break;
            }
        } else {
            for (let w in classes[c].weapons) {
                weapons.push(w);
            }
        }
        for (let w in weapons) {
            html += "<option value=\"" + weapons[w] + "-0\">" + daoc.objects[weapons[w]] + "</option>";
        }

        html += "<option disabled=\"disabled\" style=\"font-style: italic;\">&darr; Potions - Effects &darr;</option>";
        html += "<option value=\"110\">P. Invigoration</option>";
        html += "<option value=\"111\">P. Endurance</option>";
        html += "<option value=\"112\">P. Mending</option>";
        html += "<option value=\"113\">P. Healing</option>";
        html += "<option value=\"114\">P. Replenishment</option>";
        html += "<option value=\"115\">P. Power</option>";
        html += "<option value=\"116\">P. Shard Skin</option>";

        html += "<option disabled=\"disabled\" style=\"font-style: italic;\">&darr; Potions - Stats &darr;</option>";
        html += "<option value=\"120\">P. Strength</option>";
        html += "<option value=\"121\">P. Fortitude</option>";
        html += "<option value=\"122\">P. Dexterity</option>";
        html += "<option value=\"123\">P. Might</option>";
        html += "<option value=\"124\">P. Deftness</option>";
        html += "<option value=\"125\">P. Combat Speed</option>";
        html += "<option value=\"126\">P. Enlightenment</option>";

        html += "<option disabled=\"disabled\" style=\"font-style: italic;\">&darr; Misc &darr;</option>";
        html += "<option value=\"41-9\">Horse</option>";
        html += "<option value=\"100\">Respec Stones</option>";
        html += "<option value=\"101\">Remains</option>";
        html += "<option value=\"102\">Trophies</option>";
        html += "<option value=\"103\">Patterns</option>";

        let old = $("#select_slot").val();
        $("#select_slot").html(html);
        if (old) {
            $("#select_slot").val(old);
            if (!$("#select_slot").val() || $("#select_slot").val() == "") {
                let spl = old.split("-");
                if (spl.length > 1) {
                    switch (spl[1] * 1) {
                        case 21:
                        case 22:
                        case 23:
                        case 25:
                        case 27:
                        case 28:
                            $("#select_slot").val(cls_armor + "-" + spl[1]);
                            break;
                    }
                }
            }
        }
        if (!$("#select_slot").val() || $("#select_slot").val() == "") {
            $("#select_slot").val(t);
        }
        if (!$("#select_slot").val() || $("#select_slot").val() == "") {
            $("#select_slot").val(0);
        }
        if (ready) $("#select_slot").change();
    }

    $("#select_cls").change(function () {
        c = $(this).val() * 1;
        if (c == 0) {
            $("#select_cls_img").attr("src", "itm/img/all_classes.png");
        } else {
            $("#select_cls_img").attr("src", "hrald/img/" + classes[c].name + "_class_icon.webp");
            let realm = $("#select_realm").val() * 1;
            if (/*realm != 0 && */realm != classes[c].realm) {
                $("#select_realm").val(classes[c].realm).change();
            }
        }
        update_slots();
    });
    $("#select_slot").change(function () {
        t = $(this).val();
        update_url();
    });
    $("#search_clear").click(function () {
        for (let filter in filters) {
            removeFilter("_" + filter);
        }
        $("#search").val("").focusout();
        $("#select_realm").val("0").change();
        $("#select_cls").val("0").change();
        $("#select_slot").val("0").change();
    });
    $(".tooltip").click(function () {
        tooltip_hide();
    });

    registerFilterEvents();

    $.get("itm/objects.txt", function (txt) {
        let temp = txt.split("\n");
        $.each(temp, function (i, el) {
            objects[i] = el * 1;
        });

        $.get("/chrplan/icons.txt", function (iconstxt) {
            let temp = iconstxt.split("|");
            let temp0 = temp[0].split("\n");
            $.each(temp0, function (i, el) {
                if (el !== "") {
                    let elspl = el.split(",");
                    let icon = [elspl[0] * 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];

                    let len = elspl.length;
                    for (let i2 = 1; i2 < len; i2++) {
                        let eln = elspl[i2];
                        let elnt = (eln.slice(1) * 1) + 1;
                        switch (eln.charAt(0)) {
                            case "B": icon[1] = elnt; break;
                            case "S": icon[9] = elnt; break;
                            case "0": icon[2] = elnt; break;
                            case "1": icon[3] = elnt; break;
                            case "2": icon[4] = elnt; break;
                            case "3": icon[5] = elnt; break;
                            case "4": icon[6] = elnt; break;
                            case "5": icon[7] = elnt; break;
                            case "6": icon[8] = elnt; break;
                        }
                    }
                    icons[i + 1] = icon;
                }
            });
            //console.log(icons);

            let temp1 = temp[1].split("\n");
            $.each(temp1, function (i, el) {
                if (el !== "") {
                    spells[i + 1] = el * 1;
                }
            });
            //console.log(spells);

            let temp2 = temp[2].split("\n");
            $.each(temp2, function (i, el) {
                if (el !== "") {
                    styles[i + 1] = el * 1;
                }
            });
            //console.log(styles);

            $.getJSON("chrplan/daoc.json"/*?v=" + v*/, function (json) {
                daoc = json;
                $.each(daoc.classes, function (i, el) {
                    classes[el.id] = Object.assign({}, el, { name: i });
                });

                if (r !== 0) {
                    $("#select_realm").val(r).change();
                }
                $("#select_cls").val(c).change();
                if (t !== "0") {
                    $("#select_slot").val(t);
                }

                let animstopped = false;
                for (let f = 0; f < 10; f++) {
                    let filter = getparam("f" + f);
                    //if (debug) console.log("filter", filter);
                    if (filter) {
                        //let spl = filter.split("-");
                        //filters[spl[0]] = spl[1];
                        buildFilter(filter);

                        if (!animstopped) {
                            animstopped = true;
                            $(".select_addfilter").css({
                                "animation": "none"
                            });
                        }
                    }
                }

                build_page();

                $("#search").keypress(function (e) {
                    if (e.which === 13) {
                        searchItems();
                    }
                });
                $("#search_button").click(function () {
                    searchItems();
                });
                $("#select_go").click(function () {
                    searchItems();
                });

                $("#mode_db").click(function () {
                    $("#mode_db").addClass("selected");
                    $("#mode_market").removeClass("selected");
                    m = "db";
                    p = 0;
                    item_id = 0;
                    market_id = 0;
                    //update_url();
                    build_page();
                });
                $("#mode_market").click(function () {
                    $("#mode_db").removeClass("selected");
                    $("#mode_market").addClass("selected");
                    m = "market";
                    p = 0;
                    item_id = 0;
                    market_id = 0;
                    //update_url();
                    build_page();
                });

                console.log("webview-loaded");
            });
        });
    });
});

function searchItems() {
    s = $("#search").val();
    if (s.startsWith("Monster: ") || s.startsWith("Merchant: ") || s.startsWith("Quest: ") || s.startsWith("OTD: ")) {
        s = "";
    }
    p = 0;
    if (s.length < 3) {
        s = "";
        $("#search").val(s).focusout();
    }
    item_id = 0;
    market_id = 0;
    mob_id = 0;
    merchant_id = 0;
    quest_id = 0;
    otd_id = 0;
    build_page();
}

function registerFilterEvents(id) {
    id = id || "";
    if (debug) console.log("registerFilterEvents", id);
    //let key = id && id.startsWith("_") ? id.replace("_", "") : null;
    if (id !== "_s") {
        $("#select_value" + id).slider({
            range: true,
            values: [1, 30],
            min: 1,
            max: 30,
            slide: function (e, ui) {
                if (!$("#select_value" + id).attr("nochange")) {
                    $("#select_value_min" + id).val(ui.values[0]);
                    $("#select_value_max" + id).val(ui.values[1]);
                }
            },
            stop: function (e, ui) {
                if (!$("#select_value" + id).attr("nochange")) {
                    if (id.startsWith("_")) {
                        let key = id.substring(1);

                        let max = ui.values[1];
                        let propmax = $("#select_value" + id).slider("option", "max");
                        if (max >= propmax) max = 0;

                        filters[key] = ui.values[0] + "-" + max;
                        update_url();
                    }
                }
            }
        });
        $("#select_value_min" + id).change(function () {
            let min = $("#select_value_min" + id).val() * 1;
            let max = $("#select_value_max" + id).val() * 1;
            if (min > max) {
                min = max;
                $("#select_value_min" + id).val(min);
            }
            if (max < min) {
                max = min;
                $("#select_value_max" + id).val(max);
            }
            $("#select_value" + id).attr("nochange", "nochange");
            $("#select_value" + id).slider("values", 0, min);
            $("#select_value" + id).slider("values", 1, max);
            $("#select_value" + id).removeAttr("nochange");
            if (id.startsWith("_")) {
                let key = id.substring(1);

                let propmax = $("#select_value" + id).slider("option", "max");
                if (max >= propmax) max = 0;

                filters[key] = min + "-" + max;
                update_url();
            }
        });
        $("#select_value_max" + id).change(function () {
            let min = $("#select_value_min" + id).val() * 1;
            let max = $("#select_value_max" + id).val() * 1;

            if (min > max) {
                min = max;
                $("#select_value_min" + id).val(min);
            }
            if (max < min) {
                max = min;
                $("#select_value_max" + id).val(max);
            }
            $("#select_value" + id).attr("nochange", "nochange");
            $("#select_value" + id).slider("values", 0, min);
            $("#select_value" + id).slider("values", 1, max);
            $("#select_value" + id).removeAttr("nochange");
            if (id.startsWith("_")) {
                let key = id.substring(1);

                let propmax = $("#select_value" + id).slider("option", "max");
                if (max >= propmax) max = 0;

                filters[key] = min + "-" + max;
                update_url();
            }
        });
    }
    $(".select_type").change(function () {
        let id = $(this).attr("id")
            .replace("select_type_stat", "")
            .replace("select_type_resist", "")
            .replace("select_type_magic", "")
            .replace("select_type_melee", "")
            .replace("select_type_cap", "")
            .replace("select_type_toa", "")
            .replace("select_type_crafted", "")
            .replace("select_type_rog", "")
            .replace("select_type_proc", "")
            .replace("select_type_charge", "")
            .replace("select_type_source", "")
            .replace("select_type_misc", "");
        let val = $(this).val();
        if (debug) console.log("select_type", id, val);
        let cat = $("#select_cat" + id).val();
        if (cat === "source") {
            if (id !== "") {
                filters["s"] = val;
                //update_url();
            }
        } else if (cat === "proc") {
            if (id !== "") {
                filters["a"] = val;
                //update_url();
            }
        } else if (cat === "charge") {
            if (id !== "") {
                filters["c"] = val;
                //update_url();
            }
        } else {
            let min = (val in daoc.properties && "min" in daoc.properties[val] ? daoc.properties[val].min : 1) * 1;
            let max = (val in daoc.properties ? daoc.properties[val].max : 0) * 1;
            let valmin = $("#select_value_min" + id).val();
            let valmax = $("#select_value_max" + id).val();
            let wasmin = $("#select_value" + id).slider("values", 0) == $("#select_value" + id).slider("option", "min");
            let wasmax = $("#select_value" + id).slider("values", 1) == $("#select_value" + id).slider("option", "max");
            $("#select_value" + id).slider("option", "min", min);
            $("#select_value" + id).slider("option", "max", max);
            if (valmin < min) {
                valmin = min;
                $("#select_value_min" + id).val(valmin);
            }
            if (wasmin) {
                $("#select_value" + id).slider("values", 0, min);
                $("#select_value_min" + id).val(min);
            }
            if (valmax > max) {
                valmax = max;
                $("#select_value_max" + id).val(valmax);
            }
            if (wasmax) {
                $("#select_value" + id).slider("values", 1, max);
                $("#select_value_max" + id).val(max);
            }
        }
    });
    $("#select_cat" + id).change(function () {
        let id = $(this).attr("id").replace("select_cat", "");
        if (debug) console.log("select_cat", id);

        $("#select_type_stat" + id).hide();
        $("#select_type_resist" + id).hide();
        $("#select_type_magic" + id).hide();
        $("#select_type_melee" + id).hide();
        $("#select_type_cap" + id).hide();
        $("#select_type_toa" + id).hide();
        $("#select_type_crafted" + id).hide();
        $("#select_type_rog" + id).hide();
        $("#select_type_proc" + id).hide();
        $("#select_type_charge" + id).hide();
        $("#select_type_source" + id).hide();
        $("#select_type_misc" + id).hide();

        let type = $(this).val();
        switch (type) {
            case "proc":
            case "charge":
            case "source":
                $("#select_type_compact_row" + id).show();
                $("#select_value_row" + id).hide();
                $("#select_minmax_row" + id).hide();
                break;
            default:
                $("#select_type_compact_row" + id).hide();
                $("#select_value_row" + id).show();
                $("#select_minmax_row" + id).show();
                break;
        }

        $(".select_addfilter").css({
            "animation": Object.keys(filters).length > 0 ? "none" : "addfilteranim 0.4s alternate infinite"
        });

        $("#select_type_" + type + id).show();
        $("#select_type_" + type + id).change();
        $("#select_tr_type" + id).show();
        $("#select_value" + id).show();
        $("#select_operator" + id).show();
        $("#select_td_operator" + id).show();
        //$("#select_realm" + id).hide();
        //        break;
        //}
    });
    /*$("#select_operator" + id).change(function () {
        let id = $(this).attr("id").replace("select_operator", "");
        let operator = $(this).val();
        if (operator == "n") {
            $("#select_value" + id).attr("disabled", true);
        } else {
            $("#select_value" + id).attr("disabled", false);
        }
        if (key) {
            let value = $("#select_value" + id).val();
            filters[key] = operator + (operator != "n" ? value : "");
            update_url();
        }
    });*/
    /*$("#select_value" + id).change(function () {
        let id = $(this).attr("id").replace("select_value", "");
        let operator = $("#select_operator" + id).val();
        if (key) {
            let value = $("#select_value" + id).val();
            filters[key] = operator + (operator != "n" ? value : "");
            update_url();
        }
    });*/
    $("#select_addfilter" + id + ", #select_addfilter2" + id).click(function () {
        $(this).css({
            "animation": "none"
        });
        let id = $(this).attr("id").replace("select_addfilter2", "").replace("select_addfilter", "");
        if (id == "")
            createFilter();
        else removeFilter(id);
    });
}

function build_item() {
    //TEMP
    //if (item_id == 105666) {
    //    $("#market_hidder").show();
    //}


    $("#content").html("<br/><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"width: 100%;\"><tr><td class=\"center\" style=\"padding: 10px;\"><div class=\"wait\" style=\"padding: 20px;\">No item found. Update your filters!</div></td></tr></table>");
    let url = "";
    if (item_id != 0) {
        url = "itm/item.php?id=" + item_id;
    } else if (market_id != 0) {
        url = "itm/market_search.php?id=" + market_id;
    }
    if (debug) console.log(url);
    $.getJSON(url, function (item) {
        //if (debug) console.log(item);

        if (market_id != 0 && item && item.l && item.l.length == 1 && item.its) {
            let spl = item.l[0].split(",");

            item.house = spl[0];
            item.invid = spl[1];
            item.price = spl[2];
            item.condition = spl[3];
            item.durability = spl[4];
            item.quality = spl[5];
            item.id = spl[6];
            item.name = spl[7];
            item.required_level = spl[8];
            item.model = spl[9];
            item.is_custom = spl[10] * 1 === 1;
            item.utility = spl[11];
            item.bonus_types = spl[16].replace(/;/g, ",");
            item.bonus_values = spl[17].replace(/;/g, ",");

            if (item.its[item.id]) {
                let it = item.its[item.id];
                item.level = it.level;
                item.realm = it.realm;
                item.allowed_classes = it.allowed_classes;
                item.object_type = it.object_type;
                item.item_type = it.item_type;
                item.weapon_hand = it.weapon_hand;
                item.weapon_speed = it.weapon_speed;
                item.shield_size = it.shield_size;
                item.instrument_type = it.instrument_type;
                item.is_tradable = it.is_tradable;
                item.proc1_json = it.proc1_json;
                item.proc2_json = it.proc2_json;
                item.use1_json = it.use1_json;
                item.use2_json = it.use2_json;
                item.passive_json = it.passive_json;
                item.react1_json = it.react1_json;
                item.react2_json = it.react2_json;
            }

            if (item.spl) {
                let spell1 = spl[12];
                if (spell1 != 0 && spell1 in item.spl) {
                    item.proc1_json = item.spl[spell1].json;
                }
                let spell2 = spl[13];
                if (spell2 != 0 && spell2 in item.spl) {
                    item.proc2_json = item.spl[spell2].json;
                }
                let spell3 = spl[15];
                if (spell3 != 0 && spell3 in item.spl) {
                    item.use1_json = item.spl[spell3].json;
                }
                let spell4 = spl[15];
                if (spell4 != 0 && spell4 in item.spl) {
                    item.use2_json = item.spl[spell4].json;
                }
            }
        }
        current_item = item;

        if (debug) {
            console.log("item", item);
        }

        let zenk = Object.assign({}, item);
        //delete zenk["proc1_json"];
        //delete zenk["proc2_json"];
        //delete zenk["use1_json"];
        //delete zenk["use2_json"];
        //delete zenk["passive_json"];
        delete zenk["mobs"];
        delete zenk["merchants"];
        delete zenk["quests"];
        delete zenk["otds"];
        $("#zenkcraftdata").val(JSON.stringify(zenk));

        $("#preview_model").html("<img style=\"width: 100%; max-width: 100%\" src=\"itm/models/" + item.model + ".jpg\" title=\"\" alt=\"\" />");

        let html = "<table id=\"table_result\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">"
            + "<tr><td colspan=\"5\" class=\"header\" style=\"padding: 0;\"><table class=\"fullwidth\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
            + "<td class=\"nowrap center item_icon\" style=\"width: 20px;\">" + formatIcon(daoc.objects[item.object_type], daoc.slots[item.item_type], item.name, item.model) + "</td>"
            + "<td class=\"nowrap\">" + item.name + "</td><td class=\"right\">" + ((item.utility_single * 1) + (item.utility * 1) > 0 ? "Single Skill Utility&nbsp;&nbsp;" + formatUtility(item.utility_single) + "&nbsp;&nbsp;-&nbsp;&nbsp;Total Utility&nbsp;&nbsp;" + formatUtility(item.utility) : "") + "</td>"
            + "<td class=\"nowrap item_icon\" style=\"width: 20px; cursor: pointer; padding: 0 4px 0 0;\"><img class=\"loki\" src=\"itm/img/icon_loki.png\" alt=\"\" title=\"Download for Loki\" /></td>"
            + "<td class=\"nowrap item_icon\" style=\"width: 20px; cursor: pointer; padding: 0 4px 0 0;\"><img class=\"zenkcraft\" src=\"itm/img/icon_zenkcraft3.png\" alt=\"\" title=\"Copy to Zenkcraft\" /></td>"
            + "</tr></table></td></tr>";

        html += "<tr><td class=\"boxbg\" style=\"width: 10px;\"></td><td class=\"boxbg top\" style=\"padding: 0; width: 50%;\"><table class=\"fullwidth\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">";
        html += "<tr><td colspan=\"2\" class=\"title\" style=\"padding: 15px 0 0 0;\">Item Details</td></tr>";
        if ("object_type" in item)
            html += "<tr><td class=\"item_line_left\">Type</td><td class=\"item_line_right\">" + (item.object_type in daoc.objects ? daoc.objects[item.object_type] : "Generic") + "</td></tr>";
        html += "<tr><td class=\"item_line_left\">Slot</td><td class=\"item_line_right\">" + (daoc.slots[item.item_type] ? daoc.slots[item.item_type] : "Backpack") + "</td></tr>";
        if ("shield_size" in item && item.shield_size * 1 !== 0) {
            html += "<tr><td class=\"item_line_left\">Shield Size</td><td class=\"item_line_right\">" + formatShieldSize(item.shield_size) + "</td></tr>";
        }
        html += "<tr><td class=\"item_line_left\">Tradeable</td><td class=\"item_line_right\">" + formatYesNo(item.is_tradable) + "</td></tr>";
        html += "<tr><td class=\"item_line_left\">Model</td><td class=\"item_line_right\">" + item.model + "</td></tr>";
        if (item.object_type == 41) { //jewel

        } else if (item.object_type >= 31 && item.object_type <= 38) { //armor
            let af = item.level;
            if (item.object_type != 32) af *= 2; //not cloth
            html += "<tr><td colspan=\"2\" style=\"padding: 15px 5px 0 0; font-weight: bold;\">Armor Info</td></tr>";
            html += "<tr><td class=\"item_line_left\">Armor Factor</td><td class=\"item_line_right\">" + af + "</td></tr>";
        } else {
            html += "<tr><td colspan=\"2\" style=\"padding: 15px 5px 0 0; font-weight: bold;\">Damage Info</td></tr>";
            if ("level" in item)
                html += "<tr><td class=\"item_line_left\">DPS</td><td class=\"item_line_right\">" + formatDPS(item.level) + "</td></tr>";
            if ("weapon_speed" in item)
                html += "<tr><td class=\"item_line_left\">Speed</td><td class=\"item_line_right\">" + formatSpeed(item.weapon_speed) + "</td></tr>";
            html += (item.damage_type in daoc.damagetypes ? "<tr><td class=\"item_line_left\">Damage Type</td><td class=\"item_line_right\">" + daoc.damagetypes[item.damage_type] + "</td></tr>" : "");
        }
        html += "<tr><td class=\"item_line_left\">Quality</td><td class=\"item_line_right\">" + item.quality + "%</td></tr>";
        html += "<tr><td colspan=\"2\" class=\"title\" style=\"padding: 15px 0 0 0;\">Restrictions</td></tr>";
        html += "<tr><td class=\"item_line_left\">Realm</td><td class=\"item_line_right\">" + formatRealm(item.realm) + "</td></tr>";
        html += "<tr><td class=\"item_line_left\">Required Level</td><td class=\"item_line_right\">" + item.required_level + "</td></tr>";
        if ("bonus_level" in item) {
            html += "<tr><td class=\"item_line_left\">Bonus Level</td><td class=\"item_line_right\">" + item.bonus_level + "</td></tr>";
        }
        html += "<tr><td colspan=\"2\" style=\"padding: 15px 5px 0 0; font-weight: bold;\">Usable by</td></tr>";
        html += "<tr><td class=\"item_line_left\" colspan=\"2\">" + formatAllowedClasses(item.allowed_classes) + "</td></tr>";
        html += "</table><br/></td><td class=\"boxbg\" style=\"width: 10px;\"></td>";

        html += "<td class=\"boxbg top\" style=\"padding: 0; width: 50%;\"><table class=\"fullwidth\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">";

        if (item.bonus_types) {
            html += "<tr><td colspan=\"2\" class=\"title\" style=\"padding: 15px 0 0 0;\">Magical Bonuses</td></tr>";
            let props = item.bonus_types.split(",");
            let values = item.bonus_values.split(",");
            let done = [];
            let bonus_stat = {};
            let bonus_toa = {};
            let bonus_melee = {};
            let bonus_magic = {};
            let bonus_cap = {};
            let bonus_other = {};
            for (let pr in props) {
                let prop = props[pr];
                let property = daoc.properties[prop];
                if (done.indexOf(pr) < 0) {
                    done.push(pr);
                    if (!property) {
                        console.log("missing property:", prop);
                    } else {
                        if (property.name.startsWith("Stat:")) {
                            bonus_stat[pr] = property.name.replace("Stat: ", "");
                        } else if (property.name.startsWith("ToA:")) {
                            bonus_toa[pr] = property.name.replace("ToA: ", "");
                        } else if (property.name.startsWith("Melee:")) {
                            bonus_melee[pr] = property.name.replace("Melee: ", "");
                        } else if (property.name.startsWith("Magic:")) {
                            bonus_magic[pr] = property.name.replace("Magic: ", "");
                        } else if (property.name.startsWith("Cap Bonus:")) {
                            bonus_cap[pr] = property.name.replace("Cap Bonus: ", "");
                        } else {
                            bonus_other[pr] = property.name;
                        }
                    }
                }
            }

            if (Object.keys(bonus_stat).length > 0) {
                html += "<tr><td colspan=\"2\" style=\"padding: 15px 5px 0 0; font-weight: bold;\">Stat</td></tr>";
                for (let pr in bonus_stat) {
                    html += "<tr><td class=\"item_line_left\">" + bonus_stat[pr] + "</td><td class=\"item_line_right\">" + values[pr] + "</td></tr>";
                }
            }
            if (Object.keys(bonus_toa).length > 0) {
                html += "<tr><td colspan=\"2\" style=\"padding: 15px 5px 0 0; font-weight: bold;\">ToA</td></tr>";
                for (let pr in bonus_toa) {
                    html += "<tr><td class=\"item_line_left\">" + bonus_toa[pr] + "</td><td class=\"item_line_right\">" + values[pr] + "</td></tr>";
                }
            }
            if (Object.keys(bonus_melee).length > 0) {
                html += "<tr><td colspan=\"2\" style=\"padding: 15px 5px 0 0; font-weight: bold;\">Melee</td></tr>";
                for (let pr in bonus_melee) {
                    html += "<tr><td class=\"item_line_left\">" + bonus_melee[pr] + "</td><td class=\"item_line_right\">" + values[pr] + "</td></tr>";
                }
            }
            if (Object.keys(bonus_magic).length > 0) {
                html += "<tr><td colspan=\"2\" style=\"padding: 15px 5px 0 0; font-weight: bold;\">Magic</td></tr>";
                for (let pr in bonus_magic) {
                    html += "<tr><td class=\"item_line_left\">" + bonus_magic[pr] + "</td><td class=\"item_line_right\">" + values[pr] + "</td></tr>";
                }
            }
            if (Object.keys(bonus_cap).length > 0) {
                html += "<tr><td colspan=\"2\" style=\"padding: 15px 5px 0 0; font-weight: bold;\">Cap Bonus</td></tr>";
                for (let pr in bonus_cap) {
                    html += "<tr><td class=\"item_line_left\">" + bonus_cap[pr] + "</td><td class=\"item_line_right\">" + values[pr] + "</td></tr>";
                }
            }
            if (Object.keys(bonus_other).length > 0) {
                html += "<tr><td colspan=\"2\" style=\"padding: 15px 5px 0 0; font-weight: bold;\">Other</td></tr>";
                for (let pr in bonus_other) {
                    html += "<tr><td class=\"item_line_left\">" + bonus_other[pr] + "</td><td class=\"item_line_right\">" + values[pr] + "</td></tr>";
                }
            }
        }

        //html += "<tr><td style=\"width: 10px;\"></td><td class=\"item_line_left\">Type:</td><td class=\"item_line_right\">" + daoc.objects[item.object_type] + "</td><td style=\"width: 10px;\"></td></tr>";
        html += "</table><br/></td><td class=\"boxbg\" style=\"width: 10px;\"></td>"

        html += "</tr></table>";

        if (item.proc1_json != null || item.proc2_json != null || item.use1_json != null || item.use2_json != null || item.passive_json != null || item.react1_json != null || item.react2_json != null) {
            html += "<table id=\"table_spells\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top: 12px;\">"
                + "<tr><td colspan=\"5\" class=\"header\" style=\"padding: 0;\"><table class=\"fullwidth\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
                //+ "<td class=\"nowrap center item_icon\" style=\"width: 20px;\">" + formatIcon(daoc.objects[item.object_type], daoc.slots[item.item_type]) + "</td>"
                + "<td class=\"nowrap\">Magical Abilities</td>"
                + "</tr></table></td></tr>";
            html += "<tr><td class=\"boxbg\">";
            if (item.proc1_json != null) {
                html += formatSpell("First Proc", item.proc1_json);
            }
            if (item.proc2_json != null) {
                html += formatSpell("Second Proc", item.proc2_json);
            }
            if (item.use1_json != null) {
                html += formatSpell("First Use", item.use1_json);
            }
            if (item.use2_json != null) {
                html += formatSpell("Second Use", item.use2_json);
            }
            if (item.passive_json != null) {
                html += formatSpell("Passive Spell", item.passive_json);
            }
            if (item.react1_json != null) {
                html += formatSpell("First Reactive", item.react1_json);
            }
            if (item.react2_json != null) {
                html += formatSpell("Second Reactive", item.react2_json);
            }
            html += "</td></tr>";
            html += "</table>";
        }

        let mob_ids = [];
        if (item.mobs != null) {
            let spl = item.mobs.split(";");
            for (let i in spl) {
                let sp = spl[i];
                if (sp == "") continue;
                if (!(sp in mob_ids))
                    mob_ids[sp] = {};
            }
        }
        if (item.merchants != null) {
            let spl = item.merchants.split(";");
            for (let i in spl) {
                let sp = spl[i];
                if (sp == "") continue;
                let spl2 = sp.split(",");
                if (!(spl2[0] in mob_ids))
                    mob_ids[spl2[0]] = { p: spl2[1], c: spl2[2] };
            }
        }
        if (item.quests != null) {
            let spl = item.quests.split(";");
            for (let i in spl) {
                let sp = spl[i];
                if (sp == "") continue;
                if (!(sp in mob_ids))
                    mob_ids[sp] = {};
            }
        }
        if (item.otds != null) {
            let spl = item.otds.split(";");
            for (let i in spl) {
                let sp = spl[i];
                if (sp == "") continue;
                if (!(sp in mob_ids))
                    mob_ids[sp] = {};
            }
        }

        if (mob_ids.length > 0) {
            let moblist = "";
            for (let id in mob_ids) {
                if (id) {
                    moblist += "," + id;
                }
            }
            if (moblist.startsWith(",")) moblist = moblist.substring(1);
            let url = "itm/mob.php?ids=" + moblist;
            if (debug) console.log(url);
            $.getJSON(url, function (mobs) {
                //if (debug) console.log("mobs", mobs);
                if (item.mobs != null) {
                    html += "<table id=\"table_mobs\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top: 12px;\">"
                        + "<tr><td colspan=\"5\" class=\"header\" style=\"padding: 0;\"><table class=\"fullwidth\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
                        //+ "<td class=\"nowrap center item_icon\" style=\"width: 20px;\">" + formatIcon(daoc.objects[item.object_type], daoc.slots[item.item_type]) + "</td>"
                        + "<td class=\"nowrap\">From Monsters</td>"
                        + "</tr></table></td></tr>";
                    html += "<tr><td class=\"boxbg\">";
                    for (let i in mobs) {
                        let mob = mobs[i];
                        if (item.mobs.indexOf(";" + mob.id + ";") >= 0) {
                            html += formatMob(mob);
                        }
                    }
                    html += "</td></tr>";
                    html += "</table>";
                }
                if (item.merchants != null) {
                    html += "<table id=\"table_merchants\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top: 12px;\">"
                        + "<tr><td colspan=\"5\" class=\"header\" style=\"padding: 0;\"><table class=\"fullwidth\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
                        //+ "<td class=\"nowrap center item_icon\" style=\"width: 20px;\">" + formatIcon(daoc.objects[item.object_type], daoc.slots[item.item_type]) + "</td>"
                        + "<td class=\"nowrap\">From Merchants</td>"
                        + "</tr></table></td></tr>";
                    html += "<tr><td class=\"boxbg\">";
                    //console.log("test", item.merchants);
                    for (let i in mobs) {
                        let mob = mobs[i];
                        //console.log(mob);
                        if (item.merchants.indexOf(";" + mob.id + ",") >= 0) {
                            html += formatMob(mob, true, false, false, mob_ids[mob.id]);
                        }
                    }
                    html += "</td></tr>";
                    html += "</table>";
                }
                if (item.quests != null) {
                    html += "<table id=\"table_quests\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top: 12px;\">"
                        + "<tr><td colspan=\"5\" class=\"header\" style=\"padding: 0;\"><table class=\"fullwidth\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
                        //+ "<td class=\"nowrap center item_icon\" style=\"width: 20px;\">" + formatIcon(daoc.objects[item.object_type], daoc.slots[item.item_type]) + "</td>"
                        + "<td class=\"nowrap\">From Quests</td>"
                        + "</tr></table></td></tr>";
                    html += "<tr><td class=\"boxbg\">";
                    for (let i in mobs) {
                        let mob = mobs[i];
                        if (item.quests.indexOf(";" + mob.id + ";") >= 0) {
                            html += formatMob(mob, false, true, false);
                        }
                    }
                    html += "</td></tr>";
                    html += "</table>";
                }
                if (item.otds != null) {
                    html += "<table id=\"table_otds\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top: 12px;\">"
                        + "<tr><td colspan=\"5\" class=\"header\" style=\"padding: 0;\"><table class=\"fullwidth\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
                        //+ "<td class=\"nowrap center item_icon\" style=\"width: 20px;\">" + formatIcon(daoc.objects[item.object_type], daoc.slots[item.item_type]) + "</td>"
                        + "<td class=\"nowrap\">One Time Drop</td>"
                        + "</tr></table></td></tr>";
                    html += "<tr><td class=\"boxbg\">";
                    for (let i in mobs) {
                        let mob = mobs[i];
                        if (item.otds.indexOf(";" + mob.id + ";") >= 0) {
                            html += formatMob(mob, false, false, true);
                        }
                    }
                    html += "</td></tr>";
                    html += "</table>";
                }

                if (item_id != 0) {
                    build_block_market(html);
                } else {
                    build_block_buy(html);
                }
            });

        } else {

            if (item_id != 0) {
                build_block_market(html);
            } else {
                build_block_buy(html, item);
            }
        }
    });
}

function build_block_buy(html, market) {

    //let url = "itm/market_search.php?id=" + market_id;
    //if (debug) console.log(url);
    //$.getJSON(url, function (market) {
    if (debug) console.log("market", market);
    current_market_fee = market.f;
    $("#market_fee").html(current_market_fee);

    console.log("build_block_buy", market);

    html += "<table id=\"table_mobs\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top: 12px;\">"
        + "<tr><td colspan=\"5\" class=\"header\" style=\"padding: 0;\"><table class=\"fullwidth\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
        //+ "<td class=\"nowrap center item_icon\" style=\"width: 20px;\">" + formatIcon(daoc.objects[item.object_type], daoc.slots[item.item_type]) + "</td>"
        + "<td class=\"nowrap\">From Market</td>"
        + "</tr></table></td></tr>";
    html += "<tr><td class=\"boxbg\">";

    if (market.l) {
        let ms = market.l[0].split(",");
        let realm = realmFromHouse(ms[0]);
        let money = 0;
        switch (realm) {
            case 1: money = market.ma; break;
            case 2: money = market.mm; break;
            case 3: money = market.mh; break;
        }
        html += formatMarket(ms[0], ms[1], ms[2], money, ms[3], ms[4]);
    }
    html += "</td></tr>";
    html += "</table>";

    $("#content").html(html);
    tooltip_hide();

    $(".zenkcraft").click(function (e) {
        console.log("click zenkcraft");
        $("#zenkcraftdata").prop("type", "text");
        $("#zenkcraftdata").select();
        document.execCommand("copy");
        $("#zenkcraftdata").prop("type", "hidden");
        messagebox_show("This item is ready to import into Zenkcraft using the \"Import String\" button.");
    });

    $(".loki").click(function (e) {
        console.log("click loki");
        download_loki($("#zenkcraftdata").val());
    });

    update_url();
    ready = true;
    //});
}

function build_block_market(html) {
    let url = "itm/market_getitem.php?id=" + item_id;
    if (debug) console.log(url);
    $.getJSON(url, function (market) {
        if (debug) console.log("market", market);
        current_market_fee = market.f;
        $("#market_fee").html(current_market_fee);

        if (m !== "market") {
            if ((market.la && market.la.length > 0) || (market.lm && market.lm.length > 0) || (market.lh && market.lh.length > 0)) {
                html += "<table id=\"table_mobs\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top: 12px;\">"
                    + "<tr><td colspan=\"5\" class=\"header\" style=\"padding: 0;\"><table class=\"fullwidth\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
                    //+ "<td class=\"nowrap center item_icon\" style=\"width: 20px;\">" + formatIcon(daoc.objects[item.object_type], daoc.slots[item.item_type]) + "</td>"
                    + "<td class=\"nowrap\">From Market</td>"
                    + "</tr></table></td></tr>";
                html += "<tr><td class=\"boxbg\">";
                if (market.la) {
                    market.la.sort(function (a, b) { return a[2] > b[2] ? 1 : -1 });
                    for (let i in market.la) {
                        let ms = market.la[i];
                        html += formatMarket(ms[0], ms[1], ms[2], market.ma, ms[3], ms[4]);
                    }
                }
                if (market.lh) {
                    market.lh.sort(function (a, b) { return a[2] > b[2] ? 1 : -1 });
                    for (let i in market.lh) {
                        let ms = market.lh[i];
                        html += formatMarket(ms[0], ms[1], ms[2], market.mh, ms[3], ms[4]);
                    }
                }
                if (market.lm) {
                    market.lm.sort(function (a, b) { return a[2] > b[2] ? 1 : -1 });
                    for (let i in market.lm) {
                        let ms = market.lm[i];
                        html += formatMarket(ms[0], ms[1], ms[2], market.mm, ms[3], ms[4]);
                    }
                }
                html += "</td></tr>";
                html += "</table>";
            }
        }


        $("#content").html(html);
        tooltip_hide();

        $(".zenkcraft").click(function (e) {
            console.log("click zenkcraft");
            $("#zenkcraftdata").prop("type", "text");
            $("#zenkcraftdata").select();
            document.execCommand("copy");
            $("#zenkcraftdata").prop("type", "hidden");
            messagebox_show("This item is ready to import into Zenkcraft using the \"Import String\" button.");
        });

        $(".loki").click(function (e) {
            console.log("click loki");
            download_loki($("#zenkcraftdata").val());
        });

        update_url();
        ready = true;
    });
}

function build_page() {
    let max = 25;
    $("#preview_model").html("");
    $("#content").html("<br/><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"width: 100%;\"><tr><td class=\"center\" style=\"padding: 10px;\"><div class=\"triple-spinner\"></div><div class=\"wait\" style=\"padding: 20px;\">Please wait while fetching data</div></td></tr></table>");
    tooltip_hide();
    if (item_id != 0) {

        build_item();
    } else if (market_id != 0) {
        build_item();

    } else {
        let url = "itm/" + (m === "market" ? "market_" : "") + "search.php?p=" + p
            + ((r * 1) != 0 ? "&r=" + r : "")
            + ((c * 1) != 0 ? "&c=" + c : "")
            + (t != "0" ? "&t=" + t : "")
            + (s !== "" && s !== "Search by name" && mob_id == 0 && merchant_id == 0 && quest_id == 0 && otd_id == 0 ? "&s=" + encodeURIComponent(s) : "")
            + ((mob_id * 1) != 0 ? "&mob=" + mob_id : "")
            + ((merchant_id * 1) != 0 ? "&merchant=" + merchant_id : "")
            + ((quest_id * 1) != 0 ? "&quest=" + quest_id : "")
            + ((otd_id * 1) != 0 ? "&otd=" + otd_id : "");
        //+ (debug ? "&debug=1" : "");
        let f = 0;
        for (let key in filters) {
            url += "&f" + f + "=" + key + "-" + filters[key];
            f++;
            if (f >= 10) break;
        }
        if (debug) console.log(url);
        $.getJSON(url, function (data) {
            if (debug) console.log(data);

            if (m === "market") {
                let temp = [];
                if (data && data.l && data.l.length > 0 && data.its) {
                    $.each(data.l, function (i, str) {
                        let spl = str.split(",");
                        let item = {
                            house: spl[0],
                            invid: spl[1],
                            price: spl[2],
                            condition: spl[3],
                            durability: spl[4],
                            quality: spl[5],
                            id: spl[6],
                            name: spl[7],
                            required_level: spl[8],
                            model: spl[9],
                            is_custom: spl[10],
                            utility: spl[11],
                            bonus_types: spl[16].replace(/;/g, ","),
                            bonus_values: spl[17].replace(/;/g, ",")
                        };

                        if (data.its[item.id]) {
                            let it = data.its[item.id];
                            item.level = it.level;
                            item.realm = it.realm;
                            item.allowed_classes = it.allowed_classes;
                            item.object_type = it.object_type;
                            item.item_type = it.item_type;
                            //item.weapon_hand = it.weapon_hand;
                            //item.weapon_speed = it.weapon_speed;
                            //item.shield_size = it.shield_size;
                            //item.instrument_type = it.instrument_type;
                            //item.is_tradable = it.is_tradable;
                        }

                        item.realm = realmFromHouse(item.house);
                        temp.push(item);
                        market_cache[item.invid] = item;
                    });
                }
                data.items = temp;
                max_page = Math.ceil(data.c / max);
            } else {
                max_page = Math.ceil(data.total / max);
            }

            if (data && data.items && data.items.length > 0) {

                let html = "<table id=\"table_result\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">"
                    + "<tr>";
                if (m === "market") {
                    html += "<td class=\"header\" style=\"width: 36px; padding: 0;\"></td>"
                        + "<td class=\"header\">Name</td>"
                        + "<td class=\"header\" style=\"width: 120px;\">Type</td>"
                        + "<td class=\"header\" style=\"width: 120px;\">Slot</td>"
                        + "<td class=\"header center\" style=\"width: 30px;\">Level</td>"
                        + "<td class=\"header center\" style=\"width: 30px;\">Utility</td>"
                        + "<td class=\"header center\" style=\"width: 30px;\">Qua</td>"
                        + "<td class=\"header center\" style=\"width: 30px;\">Con</td>"
                        + "<td class=\"header center\" style=\"width: 30px;\">Dur</td>"
                        + "<td class=\"header center\" style=\"width: 30px;\">Price</td>"
                }
                else {
                    html += "<td class=\"header\" style=\"width: 36px; padding: 0;\"></td>"
                        + "<td class=\"header\">Name</td>"
                        + "<td class=\"header\" style=\"width: 120px;\">Type</td>"
                        + "<td class=\"header\" style=\"width: 120px;\">Slot</td>"
                        //+ "<td class=\"header\" style=\"width: 120px;\">Realm</td>"
                        + "<td class=\"header\" style=\"width: 34px;\"></td>"
                        + "<td class=\"header center\" style=\"width: 34px;\"></td>"
                        + "<td class=\"header\" style=\"width: 120px;\">Classes</td>"
                        + "<td class=\"header center\" style=\"width: 30px;\">Level</td>"
                        + "<td class=\"header center\" style=\"width: 30px;\">Utility</td>"
                }
                html += "</tr>";

                $.each(data.items, function (i, item) {
                    let bg = formatRealmShort(item.realm) + "bg";
                    let type = formatType(item.object_type) || "";
                    let slot = formatSlot(item.item_type) || "";
                    if (i % 2 == 0) bg += "2";
                    let name = item.name;
                    if (name.length > 40) {
                        name = name.substring(0, 37) + "...";
                    }
                    let id = (m === "market" ? item.invid : item.id);
                    html += "<tr id=\"result_row_" + id + "\" class=\"result_row " + bg + "\" onclick=\"" + (m === "market" ? "market" : "item") + "_go(" + id + ")\">";
                    if (m === "market") {
                        html += "<td class=\"nowrap center item_icon\">" + formatIcon(type, slot, item.name, item.model) + "</td>"
                            + "<td class=\"nowrap\">" + name + "</td>"
                            + "<td class=\"nowrap\">" + type + "</td>"
                            + "<td class=\"nowrap\">" + slot + "</td>"
                            + "<td class=\"nowrap center\">" + ("level" in item ? item.level : /*("required_level" in item ? item.required_level :*/ "-"/*)*/) + "</td>"
                            + "<td class=\"nowrap center\">" + formatUtility(item.utility) + "</td>"
                            + "<td class=\"nowrap center\">" + item.quality + "</td>"
                            + "<td class=\"nowrap center\">" + item.condition + "</td>"
                            + "<td class=\"nowrap center\">" + item.durability + "</td>"
                            + "<td class=\"nowrap center\">" + formatMoneyShort(item.price) + "</td>"
                    } else {
                        html += "<td class=\"nowrap center item_icon\">" + formatIcon(type, slot, item.name, item.model) + "</td>"
                            + "<td class=\"nowrap\">" + name + "</td>"
                            + "<td class=\"nowrap\">" + type + "</td>"
                            + "<td class=\"nowrap\">" + slot + "</td>"
                            //+ "<td class=\"nowrap\">" + formatRealm(item.realm) + "</td>"
                            + "<td class=\"nowrap center realm_logo\"><img class=\"realm_logo\" src=\"hrald/img/" + formatRealm(item.realm).toLowerCase() + "_logo.png\" alt=\"\" title=\"" + formatRealm(item.realm) + "\" /></td>"
                            + "<td class=\"nowrap center class_icon\">" + formatImageClass(item.allowed_classes) + "</td>"
                            + "<td class=\"nowrap\">" + formatAllowedClasses(item.allowed_classes, 20) + "</td>"
                            + "<td class=\"nowrap center\">" + item.level + "</td>"
                            + "<td class=\"nowrap center\">" + formatUtility(item.utility) + "</td>"

                    }
                    html += "</tr>";

                });
                html += "</table>";

                html += "<div id=\"paging\">"
                    + "<table class=\"fullwidth\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\"><tr class=\"header\">"
                    + "<td></td>"
                    + "<td style=\"width: 50px;\">&nbsp;&nbsp;Page:&nbsp;&nbsp;</td>"
                    + "<td style=\"width: 40px;\"><button id=\"page_minus\" class=\"button changepage\"><b>-</b></button></td>"
                    + "<td style=\"width: 10px;\"><input type=\"text\" id=\"page\" value=\"1\" /></td>"
                    + "<td style=\"width: 40px;\"><button id=\"page_plus\" class=\"button changepage\"><b>+</b></button></td>"
                    + "<td style=\"width: 50px; text-align: center;\">&nbsp;&nbsp;/&nbsp;&nbsp;<span id=\"maxpage\">1</span>&nbsp;&nbsp;</td>"
                    + "</tr></table>"
                    + "</div>";

                $("#content").html(html);

                $("#page").val(p + 1);
                $("#maxpage").html(max_page);

                $("#page_plus").click(function () {
                    p++;
                    if (p > max_page - 1) p = max_page - 1;
                    else build_page();
                });
                $("#page_minus").click(function () {
                    p--;
                    if (p < 0) p = 0;
                    else build_page();
                });
                $("#page").change(function () {
                    p = ($(this).val() * 1) - 1;
                    if (p < 0) p = 0;
                    build_page();
                });

                $(".result_row").mouseover(function (e) {
                    if (!ready) return;
                    let th = this;
                    e.stopPropagation();
                    e.preventDefault();
                    let id = $(this).attr("id").replace("result_row_", "");
                    if (m === "market") {
                        if (id in market_cache) {
                            tooltip_show(th, e, formatItem(market_cache[id]));
                        }
                    } else {
                        if (id in items_cache) {
                            tooltip_show(th, e, formatItem(items_cache[id]));
                        }
                        else {
                            tooltip_show(th, e, "Loading...");
                            let url = "itm/item.php?id=" + id + "&mini=1";
                            $.getJSON(url, function (it) {
                                if (debug) console.log(url, it);
                                items_cache[id] = it;
                                tooltip_hide();
                                tooltip_show(th, e, formatItem(items_cache[id]));
                            });
                        }
                    }
                }).on("middleclick", function (e) {
                    e.preventDefault();
                    let id = $(this).attr("id").replace("result_row_", "");
                    if (m === "market") {
                        window.open("https://eden-daoc.net/items?mid=" + id, "_blank");
                    } else {
                        window.open("https://eden-daoc.net/items?id=" + id, "_blank");
                    }
                });
                $(".result_row").mouseout(function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    tooltip_hide();
                });
                $("#table_result").mouseout(function (e) {
                    tooltip_hide();
                });
                $(".result_row").mousemove(function (e) {
                    tooltip_move(this, e);
                });
            } else {
                $("#content").html("<br/><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"width: 100%;\"><tr><td class=\"center\" style=\"padding: 10px;\"><div class=\"wait\" style=\"padding: 20px;\">No item found. Update your filters!</div></td></tr></table>");
            }

            update_url();
            ready = true;
        });
    }
}

function formatSpell(title, data) {
    let json = JSON.parse(data);
    let html = "";
    let name = ("Name" in json ? json.Name : "");
    if (name.indexOf("rog_") == 0 && name.indexOf("_proc_") > 0) {
        let spl = name.split("_");
        name = spl.slice(3).join(" ");
    }
    html += "<div class=\"item_spell\"><table class=\"fullwidth\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">";
    html += "<tr><td style=\"padding: 0 0 3px 0;\"><table cellpadding=\"0\" cellspacing=\"0\"><tr><td style=\"padding: 0; border: 0; width: 32px; height: 32px; border-bottom: 0 !important; padding-right: 8px;\">" + build_icon(json) + "</td><td class=\"title\" style=\"padding: 0; border-bottom: 0 !important;\">" + title + "</td></tr></table></td><td class=\"right\">" + name + "</td></tr>";

    if ("Attributes" in json) {
        for (let i in json.Attributes) {
            let attr = json.Attributes[i];
            let value = attr[1];
            if (attr[0] == "Type") {
                html += "<tr><td class=\"nowrap\">" + attr[0] + "</td><td class=\"right nowrap\">" + value + "</td></tr>";
            }
        }
        for (let i in json.Attributes) {
            let attr = json.Attributes[i];
            let value = attr[1];
            if (attr[0] == "Target") {
                switch (attr[1] * 1) {
                    case 0: value = "Unknown"; break;
                    case 1: value = "Area"; break;
                    case 2: value = "Cone"; break;
                    case 3: value = "Corpse"; break;
                    case 4: value = "Enemy"; break;
                    case 5: value = "Group"; break;
                    case 6: value = "Pet"; break;
                    case 7: value = "Realm"; break;
                    case 8: value = "Self"; break;
                }
                html += "<tr><td class=\"nowrap\">" + attr[0] + "</td><td class=\"right nowrap\">" + value + "</td></tr>";
            }
        }
    }

    if ("Level" in json) {
        html += "<tr><td>Level</td><td class=\"right\">" + json.Level + "</td></tr>";
    }

    if ("Attributes" in json) {
        for (let i in json.Attributes) {
            let attr = json.Attributes[i];
            let value = attr[1];
            if (attr[0] === "Type" || attr[0] === "Target")
                continue;
            if (attr[0] === "Confuse Ally Chance" && (value * 1) > 100)
                continue;
            html += "<tr><td class=\"nowrap\">" + attr[0] + "</td><td class=\"right nowrap\">" + value + "</td></tr>";
        }
    }
    html += "</table></div>";
    return html;
}

function get_merchant_currency(p, c) {
    switch (c) {
        case "bp": return p + " Bounty Points";
        case "dr": return p + " Dragon Scales";
        case "sh": return p + " Grimoire Pages";
        case "gal": return p + " Galladoria Roots";
        case "sid": return p + " Caer Sidi Souls";
        case "tus": return p + " Tuscaran Glacier Ices";
        case "sob": return p + " Luna Coins";
        case "df": return p + " Daemon Blood Seals";
        case "toa": return p + " Atlantean Glass";
        default:
            let str = "";
            if (p >= 10000000) {
                let val = Math.floor(p / 10000000);
                str += val + "p";
                p -= val * 10000000;
            }
            if (p >= 10000) {
                let val = Math.floor(p / 10000);
                str += " " + ("0" + val).slice(-2) + "g";
                p -= val * 10000;
            }
            if (p >= 100) {
                let val = Math.floor(p / 100);
                str += " " + ("0" + val).slice(-2) + "s";
                p -= val * 100;
            }
            if (p > 0) {
                let val = p;
                str += " " + ("0" + val).slice(-2) + "c";
            }
            return str.trim();
    }
}

function market_buy(house, invid, price, money, realm, condition, durability) {
    //messagebox_show("Soon &trade;", { top: "90%" });

    if (money >= price) {
        $("#market_accept").show();
    } else {
        $("#market_accept").hide();
    }
    current_market_invid = invid;
    current_market_lot = house;
    current_market_price = price;
    real_price = Math.ceil(current_market_price + (current_market_price * current_market_fee / 100));
    $("#market_realm_logo").attr("src", "hrald/img/" + realm.toLowerCase() + "_logo.png");
    $("#market_realm_logo").attr("title", realm);
    $("#market_itemname").html(current_item ? current_item.name : "");
    $("#market_realm").html(realm);
    $("#market_condition").html(condition + "%");
    $("#market_durability").html(durability + "%");
    $("#market_price").html(formatMoneyShort(current_market_price));
    $("#market_moneybefore").html(formatMoneyShort(money));
    $("#market_moneyafter").html(formatMoneyShort(money - real_price));
    $("#market_hidder").show();
}

function formatMarket(house, invid, price, money, condition, durability) {
    let html = "";
    let realm = formatRealm(realmFromHouse(house));
    html += "<div class=\"item_mob\" id=\"market_item_" + invid + "\"><table class=\"fullwidth\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">";
    let house_info = get_house_info(house);
    html += "<tr><td style=\"padding: 0; width: 16px; text-align: center;\"><img style=\"height: 20px;\" src=\"hrald/img/" + realm.toLowerCase() + "_logo.png\" alt=\"\" title=\"" + realm + "\" /></td><td class=\"mob_name nowrap\" onclick=\"market_buy(" + house + ", " + invid + ", " + price + ", " + money + ", '" + realm + "', " + condition + ", " + durability + ")\">[ " + realm + " ]  " + house_info[3] + " " + house + "</td><td class=\"right nowrap\">Price: " + formatMoneyShort(price) + "</td><td style=\"padding: 0; width: 16px; text-align: center;\"><a href=\"/mobs?h=" + house + "\" target=\"_blank\"><img style=\"height: 28px;\" src=\"itm/img/icon_map2.png\" alt=\"\" title=\"" + house_info[3] + "\" /></a></td></tr>";
    html += "</table></div>";
    return html;
}

function realmFromHouse(house) {
    if (house <= 1600 || (house >= 4801 && house <= 5000)) return 1;
    else if (house <= 3200 || (house >= 5001 && house <= 5200)) return 2;
    else if (house <= 4800 || (house >= 5201 && house <= 5400)) return 3;
    return 0;
}

function formatMoneyShort(money) {
    if (money == 0) return "0c";
    let copper = getCopper(money);
    let silver = getSilver(money);
    let gold = getGold(money);
    let platin = getPlatinum(money);
    let result = "";
    if (platin != 0) {
        result += platin + "p, ";
    }
    if (gold != 0) {
        result += gold + "g, ";
    }
    if (silver != 0) {
        result += silver + "s, ";
    }
    if (copper != 0) {
        result += copper + "c, ";
    }
    if (result.length > 1) {
        result = result.substring(0, result.length - 2);
    }
    return result;
}

function getCopper(money) {
    return money % 100;
}

function getSilver(money) {
    return Math.floor(money / 100 % 100);
}

function getGold(money) {
    return Math.floor(money / 100 / 100 % 1000);
}

function getPlatinum(money) {
    return Math.floor(money / 100 / 100 / 1000);
}

function formatMob(mob, is_merchant, is_quest, is_otd, mob_obj) {
    if (!is_merchant) is_merchant = false;
    if (!is_quest) is_quest = false;
    if (!is_otd) id_otd = false;
    let html = "";
    html += "<div class=\"item_mob\"><table class=\"fullwidth\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">";
    html += "<tr><td class=\"mob_name nowrap\" onclick=\"mob_go(" + mob.id + ", " + is_merchant + ", " + is_quest + ", " + is_otd + ", '" + mob.name + "')\">" + mob.name + "</td><td class=\"right nowrap\">Level: " + mob.level + "</td></tr>";
    if (mob.region != null) {
        let zone_name = mob.zone_name !== null ? mob.zone_name : mob.region_name;

        switch (mob.region * 1) {
            case 73: zone_name += " (Albion)"; break;
            case 30: zone_name += " (Midgard)"; break;
            case 130: zone_name += " (Hibernia)"; break;
        }

        html += "<tr><td class=\"nowrap\">in " + zone_name + "</td><td class=\"right nowrap\">Loc:&nbsp;&nbsp;" + (mob.zx != null && mob.zy != null ? mob.zx + " / " + mob.zy : "undisclosed") + "</td></tr>";
        if (mob_obj && "p" in mob_obj) {
            html += "<tr><td class=\"nowrap\">Price:</td><td class=\"right nowrap\">" + get_merchant_currency(mob_obj.p, mob_obj.c) + "</td></tr>";
        }
        if (mob.zone !== null) {

            let img = mob.zone * 1;
            switch (mob.zone * 1) {
                case 30: case 130: img = 73; break;
                case 31: case 131: img = 74; break;
                case 32: case 132: img = 75; break;
                case 33: case 133: img = 76; break;
                case 34: case 134: img = 77; break;
                case 38: case 138: img = 81; break;
                case 39: case 139: img = 82; break;
                case 41: case 141: img = 84; break;
                case 42: case 142: img = 85; break;
                case 43: case 143: img = 86; break;
                case 44: case 144: img = 87; break;
                case 40: case 140: img = 83; break; // ma'ati
                case 36: case 136: case 493: img = 79; break; // sobekite eternal
                case 47: case 147: img = 90; break; // City of Aerus
            }

            let zid = "" + img;
            while (zid.length < 3) zid = "0" + zid;
            let target_style = "";
            if (mob.zx != null && mob.zy != null) {
                let mx = 0, my = 0;
                if ((zid * 1) in maps) {
                    mx = (mob.zx - maps[zid * 1].offsetx) * 384 / maps[zid * 1].width;
                    my = (mob.zy - maps[zid * 1].offsety) * 384 / maps[zid * 1].height;
                } else {
                    mx = (mob.zx * 384 / 65536);
                    my = (mob.zy * 384 / 65536);
                }
                mx = Math.round(mx) - 9;
                my = Math.round(my) - 29;
                target_style = "display: block; left: " + mx + "px; top: " + my + "px";

                html += "<tr><td colspan=\"2\"><div class=\"item_mob_img\"><img src=\"itm/zones/zone" + zid + "_2048.jpg\" alt=\"\" title=\"" + mob.zone_name + "\" onerror=\"$(this).parent().parent().hide();\" />"
                    + "<div class=\"item_mob_target\" style=\"" + target_style + "\"><img src=\"itm/img/icon_target6.png\" alt=\"\" title=\"\" /></div>"
                    + "</div></td></tr>";
            }
        }
    }
    html += "</table></div>";
    return html;
}

function formatItem(it) {
    let name = it.name;
    if (name.length > 25) {
        name = name.substring(0, 22).trim() + "...";
    }
    let html = "<table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" class=\"item_mini\">"
        + "<tr><td colspan=\"2\" class=\"header\">" + name + "</td></tr>";
    //+ "<tr><td>" + daoc.slots[it.item_type] + "</td></tr>"
    //+ "<tr><td>" + daoc.objects[it.object_type] + "</td></tr>";
    if (it.bonus_types) {
        let tspl = it.bonus_types.split(",");
        let vspl = it.bonus_values.split(",");
        let c = -1;
        for (let i in tspl) {
            c++;
            let sp = tspl[i];
            html += "<tr class=\"boxbg" + (c % 2 == 0 ? "" : "2") + "\"><td>" + (sp in daoc.properties ? daoc.properties[sp].name : "id:" + sp) + "</td><td style=\"width: 20px; text-align: center;\">" + vspl[i] + "</td></tr>";
        }
        if (it.proc1_type) {
            c++
            html += "<tr class=\"boxbg" + (c % 2 == 0 ? "" : "2") + "\"><td colspan=\"2\">Proc1: " + daoc.spelltypes[it.proc1_type] + "</td></tr>";
        }
        if (it.proc2_type) {
            c++
            html += "<tr class=\"boxbg" + (c % 2 == 0 ? "" : "2") + "\"><td colspan=\"2\">Proc2: " + daoc.spelltypes[it.proc2_type] + "</td></tr>";
        }
        if (it.use1_type) {
            c++
            html += "<tr class=\"boxbg" + (c % 2 == 0 ? "" : "2") + "\"><td colspan=\"2\">Use1: " + daoc.spelltypes[it.use1_type] + "</td></tr>";
        }
        if (it.use2_type) {
            c++
            html += "<tr class=\"boxbg" + (c % 2 == 0 ? "" : "2") + "\"><td colspan=\"2\">Use2: " + daoc.spelltypes[it.use2_type] + "</td></tr>";
        }
        if (it.passive_type) {
            c++
            html += "<tr class=\"boxbg" + (c % 2 == 0 ? "" : "2") + "\"><td colspan=\"2\">Passive: " + daoc.spelltypes[it.passive_type] + "</td></tr>";
        }
        if (it.react1_type) {
            c++
            html += "<tr class=\"boxbg" + (c % 2 == 0 ? "" : "2") + "\"><td colspan=\"2\">React1: " + daoc.spelltypes[it.react1_type] + "</td></tr>";
        }
        if (it.react2_type) {
            c++
            html += "<tr class=\"boxbg" + (c % 2 == 0 ? "" : "2") + "\"><td colspan=\"2\">React2: " + daoc.spelltypes[it.react2_type] + "</td></tr>";
        }
    }
    html += "</table>";
    return html;
}

function download_loki(txt) {
    let item = JSON.parse(txt);
    if (debug) console.log("download_loki", item);
    let xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
        + "<SCItem>\n"
        + "\t<ActiveState>drop</ActiveState>\n"
        + "\t<Location>" + (item.item_type in daoc.slots ? daoc.slots[item.item_type] : "") + "</Location>\n"
        //+ "\t<Realm>" + formatRealm(item.realm) + "</Realm>\n"
        + "\t<Realm>All</Realm>\n"
        + "\t<ItemName>" + item.name + "</ItemName>\n"
        //+ "\t<AFDPS>" + ... + "</AFDPS>"
        + "\t<Bonus>0</Bonus>\n"
        + "\t<ItemQuality>" + item.quality + "</ItemQuality>\n"
        + "\t<Equipped>1</Equipped>\n"
        + "\t<Level>" + item.level + "</Level>\n"
        + "\t<OFFHAND>" + (item.weapon_hand * 1 != 0 ? "yes" : "no") + "</OFFHAND>\n"
        + "\t<SOURCE>drop</SOURCE>\n"
        + "\t<TYPE>unspecified</TYPE>\n"
        + "\t<DAMAGETYPE>None</DAMAGETYPE>\n"
        + "\t<Speed>" + ((item.weapon_speed * 1) / 10) + "</Speed>\n"
        + "\t<DBSOURCE>EDEN</DBSOURCE>\n"
        + "\t<CLASSRESTRICTIONS>\n"
        + "\t\t<CLASS>All</CLASS>\n"
        + "\t</CLASSRESTRICTIONS>\n"
        + "\t<SOURCE>drop</SOURCE>\n"
        + "\t<DROPITEM>\n";
    let types = item.bonus_types.split(",");
    let values = item.bonus_values.split(",");
    let count = 0;
    for (let i in types) {
        let type = types[i];
        let value = values[i];
        if (type in daoc.properties && daoc.properties[type].name == "ToA: Arcane Syphon")
            continue;
        count++;
        xml += "\t\t<SLOT Number=\"" + i + "\">\n"
            + "\t\t\t<Remakes>0</Remakes>\n"
            + "\t\t\t<Effect>" + getLokiStatName(type) + "</Effect>\n"
            + "\t\t\t<Qua>99</Qua>\n"
            + "\t\t\t<Amount>" + value + "</Amount>\n"
            + "\t\t\t<Done>0</Done>\n"
            + "\t\t\t<Time>0</Time>\n"
            + "\t\t\t<Type>" + getLokiStatType(type) + "</Type>\n"
            + "\t\t</SLOT>\n";
    }
    if (count < 10) {
        for (let i = count; i < 10; i++) {
            xml += "\t\t<SLOT Number=\"" + i + "\">\n"
                + "\t\t\t<Remakes>0</Remakes>\n"
                + "\t\t\t<Effect></Effect>\n"
                + "\t\t\t<Qua>99</Qua>\n"
                + "\t\t\t<Amount>0</Amount>\n"
                + "\t\t\t<Done>0</Done>\n"
                + "\t\t\t<Time>0</Time>\n"
                + "\t\t\t<Type>Unused</Type>\n"
                + "\t\t</SLOT>\n";
        }
    }
    xml += "\t</DROPITEM>\n"
        + "</SCItem>\n";
    let filename = item.name + ".xml";
    let pom = document.createElement("a");
    let bb = new Blob([xml], { type: "text/plain" });
    pom.setAttribute("href", window.URL.createObjectURL(bb));
    pom.setAttribute("download", filename);
    pom.dataset.downloadurl = ["text/plain", pom.download, pom.href].join(":");
    pom.draggable = true;
    pom.classList.add("dragout");
    pom.click();
    if (debug) console.log(xml);
}

function getLokiStatName(type) {
    if (type in daoc.properties) {
        let str = daoc.properties[type].name;
        let spl = str.split(": ");
        switch (spl[0]) {
            case "Stat":
                if (str == "Stat: Health") return "Hits";
                else if (str == "Stat: Mana") return "Power";
                else if (str == "Stat: Armor Factor") return "AF Bonus";
                else return spl[1];
            case "Resist": return spl[1] + " Resist";
            case "Magic":
                if (str == "Magic: All Skills") return "All Magic Skill Bonus";
                else return spl[1];
            case "Melee":
                if (str == "Melee: All Skills") return "All Melee Skill Bonus";
                else return spl[1];
            case "Focus": return spl[1] + " Focus";
            case "ToA":
                switch (spl[1]) {
                    case "All Melee Skills": return "All Melee Skill Bonus";
                    case "All Magic Skills": return "All Magic Skill Bonus";
                    case "All Archery Skills": return "Archery Skill Bonus";
                    case "All Dual Wielding Skills": return "All Dual Wield Skill Bonus";
                    case "Style Damage":
                    case "Spell Damage":
                    case "Spell Range":
                    case "Casting Speed":
                    case "Melee Damage":
                    case "Melee Speed":
                    case "Spell Duration":
                        return spl[1] + " Bonus";
                }
                return spl[1].replace("Effectiveness", "Bonus");
            case "Cap Bonus":
                if (str == "Cap Bonus: Health") return "Hits";
                else if (str == "Cap Bonus: Max Health") return "Hits";
                else if (str == "Cap Bonus: Mana") return "Power";
                else if (str == "Cap Bonus: Max Mana") return "Power";
                else if (str == "Cap Bonus: Power Pool") return "Power";
                else return spl[1];
        }
    }
    return "Unknown";
}

function getLokiStatType(type) {
    if (type in daoc.properties) {
        let str = daoc.properties[type].name;
        let spl = str.split(": ");
        switch (spl[0]) {
            case "Stat":
                if (str == "Stat: Health") return "Hits";
                else if (str == "Stat: Mana") return "Power";
                else if (str == "Stat: Armor Factor") return "Other Bonus";
                else return "Stat";
            case "Resist": return "Resist";
            case "Magic":
            case "Melee": return "Skill";
            case "Focus": return "Focus";
            case "ToA":
                switch (spl[1]) {
                    case "All Melee Skills": return "Skill";
                    case "All Magic Skills": return "Skill";
                    case "All Archery Skills": return "Skill";
                    case "All Dual Wielding Skills": return "Skill";
                }
                return "Other Bonus";
            case "Cap Bonus": return "Cap Increase";
        }
    }
    return "Unknown";
}

function item_go(id) {
    //document.location = "/itm/item.php?id=" + id;
    market_id = 0;
    item_id = id;
    mob_id = 0;
    merchant_id = 0;
    quest_id = 0;
    otd_id = 0;
    build_page();
}

function market_go(id) {
    market_id = id;
    item_id = 0;
    mob_id = 0;
    merchant_id = 0;
    quest_id = 0;
    otd_id = 0;
    build_page();
}

function mob_go(id, is_merchant, is_quest, is_otd, name) {
    item_id = 0;
    market_id = 0;
    p = 0;
    if (is_merchant) {
        merchant_id = id;
        s = "Merchant: " + name;
    } else if (is_quest) {
        quest_id = id;
        s = "Quest: " + name;
    } else if (is_otd) {
        otd_id = id;
        s = "OTD: " + name;
    } else {
        mob_id = id;
        s = "Monster: " + name;
    }
    $("#search").val(s).focus();
    build_page();
}

function createFilter() {
    let type = $("#select_cat").val();
    let prop = "";
    switch (type) {
        case "stat": prop = $("#select_type_stat").val(); break;
        case "resist": prop = $("#select_type_resist").val(); break;
        case "melee": prop = $("#select_type_melee").val(); break;
        case "magic": prop = $("#select_type_magic").val(); break;
        case "cap": prop = $("#select_type_cap").val(); break;
        case "toa": prop = $("#select_type_toa").val(); break;
        case "crafted": prop = $("#select_type_crafted").val(); break;
        case "rog": prop = $("#select_type_rog").val(); break;
        case "proc": prop = $("#select_type_proc").val(); break;
        case "charge": prop = $("#select_type_charge").val(); break;
        case "source": prop = $("#select_type_source").val(); break;
        case "misc": prop = $("#select_type_misc").val(); break;
    }
    //let operator = $("#select_operator").val();
    let min = $("#select_value_min").val() * 1;
    let max = $("#select_value_max").val() * 1;
    let propmax = prop in daoc.properties && "max" in daoc.properties[prop] ? daoc.properties[prop].max * 1 : 0;
    if (max >= propmax) max = 0;
    let str = "";

    switch (type) {
        case "stat":
        case "resist":
        case "melee":
        case "magic":
        case "cap":
        case "toa":
        case "crafted":
        case "rog":
        case "misc":
            //str += "p" + prop + "-" + operator + (operator != "n" ? value : "");
            str += "p" + prop + "-" + min + "-" + max;
            break;
        case "realm":
            str += "r" + prop;
            break;
        case "source":
            str += "s-" + prop;
            break;
        case "proc":
            str += "a-" + prop;
            break;
        case "charge":
            str += "c-" + prop;
            break;
    }
    buildFilter(str);
}

function removeFilter(str) {
    let key = str.replace("_", "");
    if (debug) console.log("removeFilter", key);
    $("#filter_block" + str).remove();
    delete filters[key];
    if (Object.keys(filters).length <= 0) {
        $("#filters_none").show();

        $(".select_addfilter").css({
            "animation": "addfilteranim 0.4s alternate infinite"
        });
    }
    update_url();
}

function buildFilter(str) {
    if (debug) console.log("buildFilter", str);
    let cat = str[0];
    switch (cat) {
        case "p":
            {
                let spl = str.split("-");
                let type = spl[0].substring(1);
                let min = spl[1] * 1;
                let max = spl[2] * 1;

                let key = cat + type;

                console.log("min/max", key, min, max);

                if (key in filters) {
                    console.log("filter already exists", key, filters[key]);
                    messagebox_show("You already have an active filter of this type", { left: "37%", top: "440px" });
                    return;
                }
                if (Object.keys(filters).length >= 10) {
                    messagebox_show("You're already using the maximum amount of filters allowed", { left: "37%", top: "440px" });
                    return;
                }
                //filters[key] = operator + (operator != "n" ? value : "");
                filters[key] = min + "-" + max;
                if (Object.keys(filters).length > 0) {
                    $("#filters_none").hide();
                }

                $("#filters").append(
                    $("#filter_block").parent().clone().html()
                        .replace(/(id=\".*?)(\")/g, "$1_" + key + "\"")
                        .replace(/\"\>\+\</g, " delete\">x<")
                );
                registerFilterEvents("_" + key);

                let propmin = 1;
                let prop = daoc.properties[type].name;
                if ("min" in daoc.properties[type]) {
                    propmin = daoc.properties[type].min * 1;
                    if (min < propmin) min = propmin;
                }
                let propmax = daoc.properties[type].max * 1;
                if (max == 0) max = propmax;
                console.log("min/max", key, min, max, propmax);

                let t = prop.split(": ")[0].toLowerCase();
                switch (t) {
                    case "cap bonus": t = "cap"; break;
                    case "quality": t = "misc"; break;
                    case "level": t = "misc"; break;
                    case "required_level": t = "misc"; break;
                    case "price": t = "misc"; break;
                    case "required level": t = "misc"; break;
                    case "bonus level": t = "misc"; break;
                    case "model": t = "misc"; break;
                }
                //console.log("t", t);
                $("#select_cat_" + key).val(t).change().attr("disabled", "disabled").css({ "cursor": "not-allowed" });
                $("#select_type_" + t + "_" + key).val(type).attr("disabled", "disabled").css({ "cursor": "not-allowed" });
                //$("#select_operator_" + key).val(operator);
                //$("#select_value_" + key).val(value);
                $("#select_value_min_" + key).val(min);
                $("#select_value_max_" + key).val(max);
                $("#select_value_" + key).slider("values", 0, min);
                $("#select_value_" + key).slider("values", 1, max);
                $("#select_value_" + key).slider("option", "min", propmin);
                $("#select_value_" + key).slider("option", "max", propmax);

                $("#select_type_compact_row_" + key).hide();
                $("#select_value_row_" + key).show();
                $("#select_minmax_row_" + key).show();
            }
            break;
        case "r":
            {
            }
            break;
        case "a":
            {
                let spl = str.split("-");
                let type = spl[1];
                let key = cat;
                if (key in filters) {
                    console.log("filter already exists", key, filters[key]);
                    messagebox_show("You already have an active filter of this type", { left: "37%", top: "440px" });
                    return;
                }
                if (Object.keys(filters).length >= 10) {
                    messagebox_show("You're already using the maximum amount of filters allowed", { left: "37%", top: "440px" });
                    return;
                }

                filters[key] = type;
                if (Object.keys(filters).length > 0) {
                    $("#filters_none").hide();
                }
                $("#filters").append(
                    $("#filter_block").parent().clone().html()
                        .replace(/(id=\".*?)(\")/g, "$1_" + key + "\"")
                        .replace(/\"\>\+\</g, " delete\">x<")
                );
                registerFilterEvents("_" + key);

                let t = "proc";
                $("#select_cat_" + key).val(t).change().attr("disabled", "disabled").css({ "cursor": "not-allowed" });
                $("#select_type_" + t + "_" + key).val(type).change();
                $("#select_type_compact_row_" + key).show();
                $("#select_value_row_" + key).hide();
                $("#select_minmax_row_" + key).hide();
            }
            break;
        case "c":
            {
                let spl = str.split("-");
                let type = spl[1];
                let key = cat;
                if (key in filters) {
                    console.log("filter already exists", key, filters[key]);
                    messagebox_show("You already have an active filter of this type", { left: "37%", top: "440px" });
                    return;
                }
                if (Object.keys(filters).length >= 10) {
                    messagebox_show("You're already using the maximum amount of filters allowed", { left: "37%", top: "440px" });
                    return;
                }

                filters[key] = type;
                if (Object.keys(filters).length > 0) {
                    $("#filters_none").hide();
                }
                $("#filters").append(
                    $("#filter_block").parent().clone().html()
                        .replace(/(id=\".*?)(\")/g, "$1_" + key + "\"")
                        .replace(/\"\>\+\</g, " delete\">x<")
                );
                registerFilterEvents("_" + key);

                let t = "charge";
                $("#select_cat_" + key).val(t).change().attr("disabled", "disabled").css({ "cursor": "not-allowed" });
                //if (debug) console.log("DEBUG", "#select_type_" + t + "_" + key, type);
                $("#select_type_" + t + "_" + key).val(type).change();//.attr("disabled", "disabled").css({ "cursor": "not-allowed" });
                $("#select_type_compact_row_" + key).show();
                $("#select_value_row_" + key).hide();
                $("#select_minmax_row_" + key).hide();
            }
            break;
        case "s":
            {
                let spl = str.split("-");
                let type = spl[1];
                let key = cat;
                if (key in filters) {
                    console.log("filter already exists", key, filters[key]);
                    messagebox_show("You already have an active filter of this type", { left: "37%", top: "440px" });
                    return;
                }
                if (Object.keys(filters).length >= 10) {
                    messagebox_show("You're already using the maximum amount of filters allowed", { left: "37%", top: "440px" });
                    return;
                }

                filters[key] = type;
                if (Object.keys(filters).length > 0) {
                    $("#filters_none").hide();
                }
                $("#filters").append(
                    $("#filter_block").parent().clone().html()
                        .replace(/(id=\".*?)(\")/g, "$1_" + key + "\"")
                        .replace(/\"\>\+\</g, " delete\">x<")
                );
                registerFilterEvents("_" + key);

                let t = "source";
                $("#select_cat_" + key).val(t).change().attr("disabled", "disabled").css({ "cursor": "not-allowed" });
                //if (debug) console.log("DEBUG", "#select_type_" + t + "_" + key, type);
                $("#select_type_" + t + "_" + key).val(type).change();//.attr("disabled", "disabled").css({ "cursor": "not-allowed" });
                $("#select_type_compact_row_" + key).show();
                $("#select_value_row_" + key).hide();
                $("#select_minmax_row_" + key).hide();
            }
            break;
    }
    if (ready) update_url();
}

function formatIcon(type, slot, name, model) {

    let icon = objects[model - 1];
    let offset = icon;
    if (icon >= 2840 && icon < 2940) offset -= 40;
    else if (icon >= 4040 && icon < 4140) offset -= 40;
    else if (icon >= 4155 && icon < 4255) offset -= 55;
    let mod = offset % 100;
    let x = (mod % 10) * 32;
    let y = Math.floor(mod / 10) * 32;
    let cls = "";
    if (icon >= 100 && icon < 200) {
        cls = "icon1200";
    }
    else if (icon >= 200 && icon < 300) {
        cls = "icon900";
    }
    else if (icon >= 500 && icon < 600) {
        cls = "icon1300";
    }
    else if (icon >= 2200 && icon < 2300) {
        cls = "icon1400";
    }
    else if (icon >= 2500 && icon < 2600) {
        cls = "icon1000";
    }
    else if (icon >= 2840 && icon < 2940) {
        cls = "icon1500";
    }
    else if (icon >= 4040 && icon < 4140) {
        cls = "icon1500";
    }
    else if (icon >= 4140 && icon < 4240) {
        cls = "icon1400";
    }
    if (newicons) cls += "n";
    return "<div class=\"icon " + cls + "\" style=\"background-position: -" + x + "px -" + y + "px\"></div>";





    //type = type.replace("Chain", "Scale").replace("Reinforced", "Studded").replace(/ /g, "")
    //    .replace("Slashing", "Sword").replace("Blade", "Sword").replace("Crushing", "Hammer").replace("Blunt", "Hammer").replace("Thrust", "Piercing");
    //if (!slot) slot = "";
    //slot = slot.replace(" ", "");
    //type = type.toLowerCase();
    //if (name !== undefined) {
    //    name = name.toLowerCase();
    //    if ((type == "housefloor" || type == "housewall")) {
    //        if (name.indexOf("trophy") >= 0) {
    //            slot = "trophy";
    //        }
    //    }
    //    if ((type == "genericitem" || type == "magical") && name.indexOf("remains") >= 0) {
    //        slot = "remains";
    //    }
    //    if (type == "magical" && name.indexOf("luminescent") >= 0 && name.indexOf("stone") >= 0) {
    //        slot = "respecstones";
    //    }
    //    if (type == "magical" && (name.indexOf("elixir") >= 0) || name.indexOf("potion") >= 0 || name.indexOf("draught") >= 0) {
    //        if (name.indexOf("endurance") >= 0 || name.indexOf("invigoration") >= 0) {
    //            slot = "potendo";
    //        }
    //        else if (name.indexOf("healing") >= 0 || name.indexOf("mending") >= 0) {
    //            slot = "potheal";
    //        }
    //        else if (name.indexOf("power") >= 0 || name.indexOf("replenishment") >= 0) {
    //            slot = "potmana";
    //        }
    //        else if (name.indexOf("shard") >= 0/* || name.indexOf("speed") >= 0*/) {
    //            slot = "potshard";
    //        }
    //        else if (name.indexOf("strength") >= 0) {
    //            slot = "strength";
    //        }
    //        else if (name.indexOf("fortitude") >= 0) {
    //            slot = "fortitude";
    //        }
    //        else if (name.indexOf("dexterity") >= 0) {
    //            slot = "dexterity";
    //        }
    //        else if (name.indexOf("deftness") >= 0) {
    //            slot = "deftness";
    //        }
    //        else if (name.indexOf("might") >= 0) {
    //            slot = "might";
    //        }
    //        else if (name.indexOf("enlightenment") >= 0) {
    //            slot = "enlightnement";
    //        }
    //        else if (name.indexOf("speed") >= 0) {
    //            slot = "combatspeed";
    //        }
    //    }
    //}

    //return "<img class=\"item_icon\" src=\"itm/icon/" + type + "_" + slot.toLowerCase() + ".png\" alt=\"\" title=\"" + type + " / " + slot + "\" />";
    ////return "<img class=\"item_icon\" src=\"itm/icon/" + ic + ".jpg\" alt=\"\" title=\"" + name + "\" />";
}

function formatImageClass(ac) {
    if (ac === undefined || ac == "" || ac == null || ac == ";;")
        return "<img class=\"class_icon\" src=\"itm/img/all_classes.png\" alt=\"\" title=\"All\" />";
    let spl = ac.split(";");
    if (spl.length == 3)
        return "<img class=\"class_icon\" src=\"hrald/img/" + classes[spl[1]].name + "_class_icon.webp\" alt=\"\" title=\"" + classes[spl[1]].name + "\" />";
    else {
        let spl = ac.split(";");
        let result = "";
        for (let i = 0; i < spl.length; i++) {
            let sp = spl[i];
            if (sp === "") continue;
            if (sp in classes) {
                result += ", " + classes[sp].name;
            }
        }
        if (result.startsWith(", "))
            result = result.substring(2);
        return "<img class=\"class_icon\" src=\"itm/img/all_classes.png\" alt=\"\" title=\"" + result + "\" />";
    }
}

function formatUtility(uv) {
    uv = uv * 1;
    if (uv === 0) return "-";
    return uv.toFixed(1);
}

function formatYesNo(val) {
    return val * 1 === 1 ? "Yes" : "No";
}

function formatShieldSize(size) {
    switch (size * 1) {
        default:
        case 0: return "";
        case 1: return "Small";
        case 2: return "Medium";
        case 3: return "Large";
    }
}

function formatDPS(level) {
    return (1.2 + level * 0.3).toFixed(1);
}

function formatSpeed(speed) {
    return (speed / 10).toFixed(1);
}

function formatAllowedClasses(ac, maxlen) {
    if (ac === undefined || ac == "" || ac == null || ac == ";;")
        return "All";
    let spl = ac.split(";");
    let result = "";
    for (let i = 0; i < spl.length; i++) {
        let sp = spl[i];
        if (sp === "") continue;
        if (sp in classes) {
            result += ", " + classes[sp].name;
        }
    }
    if (result.startsWith(", "))
        result = result.substring(2);
    if (maxlen < 3) maxlen = 3;
    if (result.length > maxlen)
        result = result.substring(0, maxlen - 3) + "...";
    return result;
}

function formatRealm(r) {
    switch (r * 1) {
        case 1: return "Albion";
        case 2: return "Midgard";
        case 3: return "Hibernia";
        default: return "All";
    }
}

function formatRealmShort(r) {
    switch (r * 1) {
        case 1: return "alb";
        case 2: return "mid";
        case 3: return "hib";
        default: return "all";
    }
}

function formatType(type) {
    return daoc.objects[type];
}

function formatSlot(slot) {
    return daoc.slots[slot];
}

function build_icon(sk) {
    //console.log(sk);
    let html = "";
    let icon = null;
    let skilltype = sk.SkillType * 1;
    switch (skilltype) {
        case 2:
            if (sk.Icon && spells[sk.Icon] && icons[spells[sk.Icon]]) {
                icon = icons[spells[sk.Icon]];
            }
            break;
        case 3:
            if (sk.Icon && styles[sk.Icon] && icons[styles[sk.Icon]]) {
                icon = icons[styles[sk.Icon]];
            }
            break;
        default:
            if (sk.Icon && icons[sk.Icon] && "costScheme" in sk) {
                icon = icons[sk.Icon];
            }
            break;
    }
    if (icon !== null) {
        let ic = icon[0] % 100;
        let x = (ic % 10);
        let y = (ic - x) / 10;
        let cls = Math.floor(icon[0] / 100) * 100;
        // if (debug) {
        //     console.log("icon", icon, ic, x, y, cls);
        // }
        html = "<div class=\"icon_skill icon" + cls + "\" style=\"background-position: -" + (x * 32) + "px -" + (y * 32) + "px;\">";
        if (icon[1] > 0) {
            x = (icon[1] - 1);
            y = 0;
            html += "<div class=\"icon_border\" style=\"background-position: -" + (x * 32) + "px -" + (y * 32) + "px;\"></div>";
        }
        if (icon[2] > 0) {
            x = (icon[2] - 1);
            y = 0;
            html += "<div class=\"icon_corner icon_upleft\" style=\"background-position: -" + (x * 10) + "px -" + (y * 10) + "px;\"></div>";
        }
        if (icon[3] > 0) {
            x = (icon[3] - 1);
            y = 0;
            html += "<div class=\"icon_corner icon_up icon_up\" style=\"background-position: -" + (x * 10) + "px -" + (y * 10) + "px;\"></div>";
        }
        if (icon[4] > 0) {
            x = (icon[4] - 1);
            y = 0;
            html += "<div class=\"icon_corner icon_upright\" style=\"background-position: -" + (x * 10) + "px -" + (y * 10) + "px;\"></div>";
        }
        if (icon[5] > 0) {
            x = (icon[5] - 1);
            y = 0;
            html += "<div class=\"icon_corner icon_right\" style=\"background-position: -" + (x * 10) + "px -" + (y * 10) + "px;\"></div>";
        }
        if (icon[6] > 0) {
            x = (icon[6] - 1);
            y = 0;
            html += "<div class=\"icon_corner icon_downright\" style=\"background-position: -" + (x * 10) + "px -" + (y * 10) + "px;\"></div>";
        }
        if (icon[7] > 0) {
            x = (icon[7] - 1);
            y = 0;
            html += "<div class=\"icon_corner icon_down\" style=\"background-position: -" + (x * 10) + "px -" + (y * 10) + "px;\"></div>";
        }
        if (icon[8] > 0) {
            x = (icon[8] - 1);
            y = 0;
            html += "<div class=\"icon_corner icon_left\" style=\"background-position: -" + (x * 10) + "px -" + (y * 10) + "px;\"></div>";
        }
        if (icon[9] > 0) {
            ic = icon[9] - 1;
            x = (ic % 7);
            y = (ic - x) / 7;
            html += "<div class=\"icon_spell\" style=\"background-position: -" + (x * 20) + "px -" + (y * 12) + "px;\"></div>";
        }
        html += "</div>";
    }
    return html;
}

function get_house_info(lot) {
    if (lot >= 3801 && lot <= 4000) return [3, 202, 215, "Dunshire"];
    else if (lot >= 3201 && lot <= 3400) return [3, 202, 213, "Meath"];
    else if (lot >= 3601 && lot <= 3800) return [3, 202, 218, "Killcullen"];
    else if (lot >= 4001 && lot <= 4200) return [3, 202, 219, "Saeranthal"];
    else if (lot >= 3401 && lot <= 3600) return [3, 202, 217, "Torrylin"];
    else if (lot >= 4201 && lot <= 4400) return [3, 202, 225, "Aberillan"];
    else if (lot >= 4601 && lot <= 4800) return [3, 202, 273, "Moycullen"];
    else if (lot >= 4401 && lot <= 4600) return [3, 202, 272, "Tullamore"];
    else if (lot >= 5201 && lot <= 5400) return [3, 202, 274, "Broughshane"];
    else if (lot >= 2201 && lot <= 2400) return [2, 102, 117, "Arothi"];
    else if (lot >= 2601 && lot <= 2800) return [2, 102, 122, "Kaupang"];
    else if (lot >= 5001 && lot <= 5200) return [2, 102, 268, "Stavgaard"];
    else if (lot >= 1601 && lot <= 1800) return [2, 102, 268, "Erikstaad"];
    else if (lot >= 1801 && lot <= 2000) return [2, 102, 118, "Carlingford"];
    else if (lot >= 2801 && lot <= 3000) return [2, 102, 266, "Holmestrand"];
    else if (lot >= 2001 && lot <= 2200) return [2, 102, 119, "Wyndham"];
    else if (lot >= 2401 && lot <= 2600) return [2, 102, 121, "Frisia"];
    else if (lot >= 3001 && lot <= 3200) return [2, 102, 267, "Nittedal"];
    else if (lot >= 4801 && lot <= 5000) return [1, 2, 262, "Stoneleigh"];
    else if (lot >= 801 && lot <= 1000) return [1, 2, 20, "Brisworthy"];
    else if (lot >= 201 && lot <= 400) return [1, 2, 17, "Rilan"];
    else if (lot >= 1201 && lot <= 1400) return [1, 2, 260, "Chiltern"];
    else if (lot >= 401 && lot <= 600) return [1, 2, 18, "Dalton"];
    else if (lot >= 1 && lot <= 200) return [1, 2, 13, "Caerwent"];
    else if (lot >= 1401 && lot <= 1600) return [1, 2, 261, "Sherborne"];
    else if (lot >= 1001 && lot <= 1200) return [1, 2, 64, "Aylesbury"];
    else if (lot >= 601 && lot <= 800) return [1, 2, 16, "Old Sarum"];
    return [0, 0, 0, "House"];
}

function update_url() {
    if (debug) console.log("update_url"/*, new Error().stack*/);
    let params = (m !== "db" ? "&m=" + m : "")
        + (s !== "" && s !== "Search by name" ? "&s=" + s : "")
        + ((p * 1) !== 0 ? "&p=" + (p + 1) : "")
        + ((r * 1) !== 0 ? "&r=" + r : "")
        + ((c * 1) !== 0 ? "&c=" + c : "")
        + (t !== "0" ? "&t=" + t : "")
        + (item_id !== 0 ? "&id=" + item_id : "")
        + (market_id !== 0 ? "&mid=" + market_id : "")
        + (mob_id !== 0 ? "&mob=" + mob_id : "")
        + (merchant_id !== 0 ? "&merchant=" + merchant_id : "")
        + (quest_id !== 0 ? "&quest=" + quest_id : "")
        + (otd_id !== 0 ? "&otd=" + otd_id : "");
    let f = 0;
    for (let key in filters) {
        params += "&f" + f + "=" + key + "-" + filters[key];
        f++;
        if (f >= 10)
            break;
    }
    let newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + (params.length > 1 ? "?" + params.substring(1) : "");
    $("#directurl").val(newurl);
    if (document.location.href !== newurl) {
        if (window.history.pushState) {
            window.history.pushState({ path: newurl }, "", newurl);
            console.log("pushState", newurl);
        }
    }
    if (Cookies) {
        Cookies.set("items_newicons", newicons);
    }
}

function getparam(key) {
    var result = null, tmp = [];
    var items = location.search.substr(1).split("&");
    for (let index = 0; index < items.length; index++) {
        tmp = items[index].split("=");
        if (tmp[0] === key)
            result = decodeURIComponent(tmp[1]);
    }
    return result;
}

var messagebox_timer = null;
function messagebox_show(msg, css) {
    if (css) {
        $("#messagebox").css(css);
    }
    $("#messagebox").html(msg);
    setTimeout(function () {
        $("#hidder").show();
        if (messagebox_timer !== null)
            clearTimeout(messagebox_timer);
        messagebox_timer = setTimeout(function () {
            messagebox_hide();
        }, 5000);
    }, 1);
}
function messagebox_hide() {
    $("#hidder").fadeOut(function () {
        $("#messagebox").css({
            top: "15%",
            left: "50%"
        });
    });
}

var tooltip_visible = false;
var tooltip_offsetw = 330;
var tooltip_offseth = 165;
var tooltip_height = 0;
function tooltip_show(el, e, title) {
    if ($(".tooltip").html() !== title) {
        $(".tooltip").css({ "left": 0, "top": 0, "opacity": 0.01 }).html(title);
    }
    if (!tooltip_visible) {
        tooltip_visible = true;
        let pos = $(el).position();
        let off = $(el).offset();
        let x = e.pageX - off.left + pos.left + tooltip_offsetw;
        let y = e.pageY - off.top + pos.top + tooltip_offseth - 5;
        let tooltip_height = $(".tooltip").height();
        if (e.pageY + tooltip_height + 5 > $(document).height()) {
            y -= tooltip_height - 20;
        }
        $(".tooltip").css({ "left": x, "top": y, "opacity": 1 }).show();
    }
}
function tooltip_hide() {
    if (tooltip_visible) {
        tooltip_visible = false;
        $(".tooltip").hide();
    }
}
function tooltip_move(el, e) {
    if (tooltip_visible) {
        let pos = $(el).position();
        let off = $(el).offset();
        let x = e.pageX - off.left + pos.left + tooltip_offsetw;
        let y = e.pageY - off.top + pos.top + tooltip_offseth - 5;
        let tooltip_height = $(".tooltip").height();
        if (e.pageY + tooltip_height + 5 > $(document).height()) {
            y -= tooltip_height - 20;
        }
        $(".tooltip").css({ "left": x, "top": y });
    }
}

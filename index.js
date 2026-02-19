const white = document.getElementById("white-input");
const brown = document.getElementById("brown-input");
const green = document.getElementById("green-input");
const wsmall = document.getElementById("wsmall-input");
const black = document.getElementById("black-input");
const blue = document.getElementById("blue-input");
const yellow = document.getElementById("yellow-input");
const wlarge = document.getElementById("wlarge-input");
const ultratech = document.getElementById("ultratech-input");
const ships = document.getElementById("ships-input");
const vips = document.getElementById("vp-input");
const score_text = document.getElementById("score");
const faction_select = document.getElementById("faction-select");
const add_card_faction_select = document.getElementById("add-card-faction-select");
const card_dropdown_container = document.getElementById("card-dropdown-container");
const card_selector = document.getElementById('card_selector');
const add_card_dropdown_container = document.getElementById("add-card-dropdown-container");
const add_card_modal = new bootstrap.Modal("#card_selector");

let card_dropdown_starting;
let card_dropdown_t1;
let card_dropdown_t2;
let card_dropdown_t3;
let card_dropdown_misc;

const totals_holder = document.getElementById("totals-holder");

let all_cards;
// list of "path" to cards
let cards_to_add = new Set();
let active_cards = {};

const WHITE_ARROW_IMG = '<img class="converter-arrow" src="assets/icons/white_arrow.png" alt="arrow" />';

const USE_ICONS = true;

const FILENAMES = {
    white: "white.png",
    green: "green.png",
    brown: "brown.png",
    wsmall: "small_grey.png",
    asmall: "small_any.png",
    yellow: "yellow.png",
    blue: "blue.png",
    black: "black.png",
    wlarge: "large_grey.png",
    alarge: "large_any.png",
    ultratech: "ultratech.png",
    vp: "victory_point.png",
    ships: "ship.png",
};
const RESOURCES = [
    "white",
    "green",
    "brown",
    "wsmall",
    "yellow",
    "blue",
    "black",
    "wlarge",
    "ultratech",
    "vp",
    "ships",
];
const CLASSNAMES = {
    white: "small-cube",
    green: "small-cube",
    brown: "small-cube",
    wsmall: "small-cube",
    asmall: "small-cube",
    yellow: "large-cube",
    blue: "large-cube",
    black: "large-cube",
    wlarge: "large-cube",
    alarge: "large-cube",
    ultratech: "large-cube",
    vp: "victory-point",
    ships: "ship",
};

async function getData() {
    let output = await fetch('./output.json');
    const temp = await output.json();
    // normalize 'all cards' so that data structure is the same between
    // unique/starting cards and tech cards
    all_cards = {};
    for (let [faction_id, faction_data] of Object.entries(temp)) {
        let data = faction_data;

        const unique_cards = ("unique_cards" in data) ? [...faction_data["unique_cards"]] : [];
        data["unique_cards"] = {};
        for (var i = 0; i < unique_cards.length; i++) {
            const unique_card_id = `unique${i}`;
            data["unique_cards"][unique_card_id] = unique_cards[i];
        }

        const starting_cards = ("starting_cards" in data) ? [...faction_data["starting_cards"]] : [];
        data["starting_cards"] = {};
        for (var i = 0; i < starting_cards.length; i++) {
            const starting_card_id = `starting${i}`;
            data["starting_cards"][starting_card_id] = starting_cards[i];
        }

        const transpose_keys = ["input", "output", "upgrade_input", "upgrade_output"];
        const tech_cards = Object.entries(faction_data["tech_cards"])
        // data["tech_cards"] = {};
        for (let [id, card] of tech_cards) {
            let converter = {};
            for (const key of transpose_keys) {
                converter[key] = card[key];
                delete card[key];
            }
            card["converters"] = [converter];
            data["tech_cards"][id] = card;
        }

        all_cards[faction_id] = data;
    }
    // add properties to all converters
    for (let [_faction_id, faction_data] of Object.entries(all_cards)) {
        for (const key of ["tech_cards", "unique_cards", "starting_cards"]) {
            if (!(key in faction_data)) {
                continue;
            }
            for (let [_id, card] of Object.entries(faction_data[key])) {
                card["upgraded"] = false;
                for (const converter of card.converters) {
                    converter["running"] = false;
                    converter["owned"] = false;
                    converter["hidden"] = false;
                    converter["ee_tokens"] = 0;
                    converter["ttl"] = 0;
                }
            }
        }

    }
}

(() => {
    getData().then(() => {
        console.log('loaded data');
        main();
    });
})();

/* Start calculations */
function generate_rotting_totals() {
    return {
        owned: {
            white: parseInt(white.value),
            brown: parseInt(brown.value),
            green: parseInt(green.value),
            wsmall: parseInt(wsmall.value),
            black: parseInt(black.value),
            yellow: parseInt(yellow.value),
            blue: parseInt(blue.value),
            wlarge: parseInt(wlarge.value),
            ultratech: parseInt(ultratech.value),
            ships: parseInt(ships.value),
            vp: parseInt(vips.value)
        },
        donations: {},
    };
}

function empty_totals() {
    const owned = RESOURCES.reduce((owned_totals, resource_name) => {
        owned_totals[resource_name] = 0;
        return owned_totals;
    }, {});
    const donation = RESOURCES.reduce((donation_totals, resource_name) => {
        donation_totals[resource_name] = 0;
        return donation_totals;
    }, {});
    return {
        owned: owned,
        donations: donation,
    };

}

function sum_owned_donations(total) {
    const sum = RESOURCES.reduce((totals, resource_name) => {
        const owned = total["owned"]?.[resource_name];
        const donation = total["donations"]?.[resource_name];
        totals[resource_name] = (owned ? owned : 0) + (donation ? donation : 0);
        return totals;
    }, {});
    return sum;
}

function add_totals(t1, t2) {
    const owned = RESOURCES.reduce((owned_totals, resource_name) => {
        const t1_resource = t1["owned"]?.[resource_name] ? t1["owned"]?.[resource_name] : 0;
        const t2_resource = t2["owned"]?.[resource_name] ? t2["owned"]?.[resource_name] : 0;
        owned_totals[resource_name] = t1_resource + t2_resource;
        return owned_totals;
    }, {});
    const donation = RESOURCES.reduce((donation_totals, resource_name) => {
        const t1_resource = t1["donations"]?.[resource_name] ? t1["donations"]?.[resource_name] : 0;
        const t2_resource = t2["donations"]?.[resource_name] ? t2["donations"]?.[resource_name] : 0;
        donation_totals[resource_name] = t1_resource + t2_resource;
        return donation_totals;
    }, {});
    return {
        owned: owned,
        donations: donation,
    };
}

function sub_totals(t1, t2) {
    const owned = RESOURCES.reduce((owned_totals, resource_name) => {
        const t1_resource = t1["owned"][resource_name] ? t1["owned"][resource_name] : 0;
        const t2_resource = t2["owned"][resource_name] ? t2["owned"][resource_name] : 0;
        owned_totals[resource_name] = t1_resource - t2_resource;
        return owned_totals;
    }, {});
    const donation = RESOURCES.reduce((donation_totals, resource_name) => {
        const t1_resource = t1["donations"][resource_name] ? t1["donations"][resource_name] : 0;
        const t2_resource = t2["donations"][resource_name] ? t2["donations"][resource_name] : 0;
        donation_totals[resource_name] = t1_resource - t2_resource;
        return donation_totals;
    }, {});
    return {
        owned: owned,
        donations: donation,
    };
}

function calculate_score(totals) {
    let smalls = totals.white + totals.brown + totals.green + totals.wsmall + totals.ships;
    let larges = totals.black + totals.blue + totals.yellow + totals.wlarge;
    let vp = totals.vp + Math.floor(smalls / 6) + Math.floor(larges / 4) + Math.floor(totals.ultratech / 2);
    let partials = (smalls % 6) * 2 + (larges % 4) * 3 + (totals.ultratech % 2) * 6;

    vp += Math.floor(partials / 12);
    partials = partials % 12;

    return {
        vp: vp,
        partial: partials
    };
}

function converter_to_totals(data, upgraded) {
    let outputs = upgraded ? data.upgrade_output : data.output;
    return outputs;
}

function converter_inputs_to_totals(data, upgraded) {
    let inputs = upgraded ? data.upgrade_input : data.input;
    return inputs;
}

function generate_card_totals() {
    let totals = empty_totals();
    for (let [faction_id, cards] of Object.entries(active_cards)) {
        for (let [card_id, card] of Object.entries(cards)) {
            for (let converter of card.converters) {
                if (converter.running) {
                    totals = add_totals(totals, converter_to_totals(converter, card.upgraded));
                }
            }
        }
    }
    return totals;
}

function count_card_inputs() {
    let totals = empty_totals();
    for (let [faction_id, cards] of Object.entries(active_cards)) {
        for (let [card_id, card] of Object.entries(cards)) {
            for (let converter of card.converters) {
                if (converter.running) {
                    totals = add_totals(totals, converter_inputs_to_totals(converter, card.upgraded));
                }
            }
        }
    }
    return totals;
}

function update_score() {
    let rotting = generate_rotting_totals();
    let cards = generate_card_totals();
    let total = add_totals(rotting, cards);

    let score = calculate_score(total);

    score_text.innerText = `Final Score: ${score.vp} + ${score.partial}/12`;

    let inputs = count_card_inputs();
    let net = sub_totals(total, inputs);

    totals_holder.innerHTML = `
    <h4>Gain:</h4>
    <div class="row">
        ${format_total_tr(cards.owned, "Owned:")}
        ${format_total_tr(cards.donations, "Donations:")}
        ${format_total_tr(sum_owned_donations(cards), "Total:")}
    </div>
    <hr>
    <h4>Net:</h4>
    <div class="row">
        ${format_total_tr(net.owned, "Owned:")}
        ${format_total_tr(net.donations, "Donations:")}
        ${format_total_tr(sum_owned_donations(net), "Total:")}
    </div>`;
}
/* End calculations */

/* Start formatting */
function format_smalls(total) {
    return `${total.green ?? 0} green, ${total.brown ?? 0} brown, ${total.white ?? 0} white, ${total.wsmall ?? 0} wild small,`;
}

function format_larges(total) {
    return `${total.blue ?? 0} blue, ${total.yellow ?? 0} yellow, ${total.black ?? 0} black, ${total.wlarge ?? 0} wild large,`;
}

function format_other(total) {
    return `${total.ultratech ?? 0} ultratech, ${total.ships ?? 0} ships, ${total.vp ?? 0} vp`;
}

function format_total_tr(total, header_text) {
    const resources_html = RESOURCES.map((resource_name) => {
        const classname = CLASSNAMES[resource_name];
        const filename = "assets/icons/" + FILENAMES[resource_name];
        const count = total[resource_name];
        const color_class = count < 0 ? "text-danger" : count > 0 ? "text-success" : "";
        return `
        <div class="col-sm">
        <span class="${color_class}">${count}</span>
        <img class="centered ${classname}" src="${filename}" alt="${classname}" />
        </div>`;
    }).join("");

    return `
    <div class="col-4 col-md-12">
        <div class="row">
            <div class="col-sm-2">${header_text}</div>${resources_html}
        </div>
    </div>
    `;
}
/* End formatting */

let calc_net = false;

function create_starting_converters() {
    let curr_faction = faction_select.value;


    for (let [faction_id, faction_data] of Object.entries(all_cards)) {
        for (const key of ["tech_cards", "unique_cards", "starting_cards"]) {
            if (!(key in faction_data)) {
                continue;
            }
            for (let [card_id, card] of Object.entries(faction_data[key])) {
                for (let converter of card.converters) {
                    converter.owned = false;
                    converter.running = false;
                }
            }
        }
    }
    active_cards = {};

    if (!all_cards[curr_faction].starting_cards) {
        return;
    }

    for (let [_id, card] of Object.entries(all_cards[curr_faction].starting_cards)) {
        for (const converter of card.converters) {
            if ("upgrade-inputs" in converter) {
                continue;
            }
            converter.owned = true;
        }
    }

    render_cards();
}

function create_faction_options() {
    for (const el of document.getElementsByClassName("faction-select")) {
        for (let faction of Object.values(all_cards)) {
            let option = document.createElement("option");
            option.value = faction.id;
            option.innerText = faction.name;
            el.appendChild(option);
            active_cards[faction.id] = {};
        }
    }
}

function create_card_dropdowns() {
    card_dropdown_container.innerHTML = "";
    card_dropdown_starting = card_dropdown_container.appendChild(dropdown_card("Starting", "card-dropdown-starting", [], false));
    card_dropdown_t1 = card_dropdown_container.appendChild(dropdown_card("Tier 1", "card-dropdown-tier1", [], true));
    card_dropdown_t2 = card_dropdown_container.appendChild(dropdown_card("Tier 2", "card-dropdown-tier2", [], true));
    card_dropdown_t3 = card_dropdown_container.appendChild(dropdown_card("Tier 3", "card-dropdown-tier3", [], true));
    card_dropdown_misc = card_dropdown_container.appendChild(dropdown_card("Misc", "card-dropdown-misc", [], true));
    card_dropdown_starting = card_dropdown_starting.children[1].children[0];
    card_dropdown_t1 = card_dropdown_t1.children[1].children[0];
    card_dropdown_t2 = card_dropdown_t2.children[1].children[0];
    card_dropdown_t3 = card_dropdown_t3.children[1].children[0];
    card_dropdown_misc = card_dropdown_misc.children[1].children[0];
    add_card_element = card_dropdown_container.appendChild(document.createElement("div"));
    add_card_element.classList.add("row");
    add_card_element.setAttribute("data-bs-toggle", "modal");
    add_card_element.setAttribute("data-bs-target", "#card_selector");
    add_card_element.innerHTML = `<div class="col card" id="add-card"><h2 class="text-center">Add Converter(s)</h2></div>`;
}

function isEmptyObject(obj) {
    for (const prop in obj) {
        if (Object.hasOwn(obj, prop)) {
            return false;
        }
    }

    return true;
}

function format_resources_icons(res) {
    let output = "";
    if (!isEmptyObject(res.owned)) {
        output += Object.entries(res.owned).map((resource) => { return resource_icon(resource, false) }).join("");
    }

    if (!isEmptyObject(res.donations)) {
        output += Object.entries(res.donations).map((resource) => { return resource_icon(resource, true) }).join("");
    }

    return output;
}

function resource_icon(res, is_donation) {
    [resource_name, count] = res
    const classname = CLASSNAMES[resource_name];
    const filename = "assets/icons/" + FILENAMES[resource_name];
    const count_display = count > 1 ? count : "";
    const donation_border = is_donation ? `<img class="centered donation ${classname}" src="${get_donation_border_filename(resource_name)}" />` : "";
    return `
            <div class="resource ${classname}">
                ${donation_border}
                <img class="centered ${classname}" src="${filename}" alt="${format_resources_text(res)}" />
                <span class="centered">${count_display}</span>
            </div>`; // whitespace here must be missing for correct arrow formatting
}

function get_donation_border_filename(resource_name) {
    let filename;
    if (resource_name === "ultratech") {
        filename = "ultratech_donation_border.png";
    } else if (resource_name === "vp") {
        filename = "vp_donation_border.png";
    } else if (resource_name === "ships") {
        filename = "ship_donation_border.png";
    } else {
        filename = "cube_donation_border.png";
    }
    return "assets/icons/" + filename;
}

function format_resources_text(res) {
    let output = '';
    const names = {
        white: 'White',
        green: 'Green',
        brown: 'Brown',
        wsmall: 'Wild Small',
        asmall: 'Any Small',
        yellow: 'Yellow',
        blue: 'Blue',
        black: 'Black',
        wlarge: 'Wild Large',
        alarge: 'Any Large',
        ultratech: 'Ultratech',
        vp: 'VP',
        ships: 'Ships',
    };

    if (!isEmptyObject(res.owned)) {
        output += Object.entries(res.owned).map(([key, value]) => {
            return `${value} ${names[key]}`;
        }).join(', ');
    }

    if (!isEmptyObject(res.donations)) {
        if (output != '') {
            output += ' + ';
        }
        output += Object.entries(res.donations).map(([key, value]) => {
            let fmtted = key.charAt(0).toUpperCase() + key.slice(1);
            return `${value} ${names[key]}`;
        }).join(', ');

        output += ' as donations';
    }

    return output;
}

function converter_html(input, output) {
    if (USE_ICONS) {
        return `
            <span class="converter-inputs">${format_resources_icons(input)}${WHITE_ARROW_IMG}</span>
            <span class="converter-outputs">${format_resources_icons(output)}</span>
        `;
    } else {
        return `
            <span class="converter-inputs">${format_resources_text(input)}</span>
            <span class="converter-arrow">→</span>
            <span class="converter-outputs">${format_resources_text(output)}</span>
        `;
    }
}

function get_card(card_info) {
    return all_cards[card_info.faction_id][card_info.card_category][card_info.card_id];
}

function get_converter(converter_info) {
    return get_card(converter_info).converters[converter_info.converter_idx]
}

function converter_id(converter_info) {
    let card = get_card(converter_info);
    if (card.converters.length > 1) {
        return `${converter_info.faction_id}-${converter_info.card_id}-${converter_info.converter_idx}`;
    } else {
        return `${converter_info.faction_id}-${converter_info.card_id}`;
    }
}

function toggle_add_card(select_button, path) {
    const card_element = select_button.parentElement.parentElement;
    if (cards_to_add.has(path)) {
        // remove card
        card_element.classList.remove("selected-for-add");
        cards_to_add.delete(path);
    } else {
        // add card
        card_element.classList.add("selected-for-add");
        cards_to_add.add(path);
    }
}

function create_owned_card_footer(converter_info) {
    let id = converter_id(converter_info);
    let card = get_card(converter_info);
    let converter = get_converter(converter_info);

    let card_footer_el = document.createElement("div");
    card_footer_el.classList.add("card-footer");

    let toggle_button = document.createElement("button");
    toggle_button.id = `toggle-${id}`;
    toggle_button.classList.add("btn", "btn-light", "float-end");
    toggle_button.innerText = converter.running ? "Unmark Running" : "Mark Running";
    toggle_button.addEventListener("click", (ev) => { toggle_converter(converter_info) });
    card_footer_el.appendChild(toggle_button);
    let upgrade_button = document.createElement("button");
    upgrade_button.classList.add("btn", "btn-light", "float-start");
    upgrade_button.id = `upgrade-${id}`;
    upgrade_button.innerText = card.upgraded ? "Downgrade" : "Upgrade";
    upgrade_button.addEventListener("click", () => { toggle_upgrade(converter_info) });
    upgrade_button.setAttribute('card-id', converter_info.card_id);
    card_footer_el.appendChild(upgrade_button);
    return card_footer_el;
}

function create_add_card_footer(converter_info, defaultTtl) {
    let card_footer_el = document.createElement("div");
    card_footer_el.classList.add("card-footer", "d-flex", "flex-row");

    const path = `${converter_info.faction_id}/${converter_info.card_category}/${converter_info.card_id}/${converter_info.converter_idx}`;

    let ttl_select = document.createElement("select");
    ttl_select.id = `${path}-ttl`;
    ttl_select.classList.add("form-select");
    ttl_select.add(new Option("∞", "6", defaultTtl == 6));
    for (let i = 1; i <= 5; i++) {
        ttl_select.add(new Option(i, i, defaultTtl == i));
    }
    let ttl_label = document.createElement("label");
    ttl_label.classList.add("input-group-text");
    ttl_label.labelFor = ttl_select.id;
    ttl_label.textContent = "Rounds";
    let ttl_div = document.createElement("div");
    ttl_div.classList.add("input-group", "float-start", "w-50");
    ttl_div.appendChild(ttl_label);
    ttl_div.appendChild(ttl_select);
    card_footer_el.appendChild(ttl_div);

    let select_button = document.createElement("button");
    select_button.classList.add("ms-auto", "btn", "btn-light");
    select_button.id = `${path}-select`;
    select_button.innerText = "Select";
    select_button.addEventListener("click", (event) => { toggle_add_card(event.target, path) });
    card_footer_el.appendChild(select_button);
    return card_footer_el;
}

function create_card_element(converter_info, name, upgraded, converter, card_footer_el) {
    const input = upgraded ? converter.upgrade_input : converter.input;
    const output = upgraded ? converter.upgrade_output : converter.output;
    const id = converter_id(converter_info);
    let card_el_wrapper = document.createElement("div");
    card_el_wrapper.classList.add("col");
    let card_el = document.createElement("div");
    card_el.classList.add("col", "card", "converter", "text-center");
    if (converter.running) {
        card_el.classList.add("running");
    }
    card_el.setAttribute("data-faction", converter_info.faction_id);
    card_el.id = `card-${id}`;

    let card_header_el = document.createElement("div");
    card_header_el.classList.add("card-header");
    card_header_el.innerHTML = `<span class="converter-name" id="card-name-${id}">${name}</span>`;
    let card_body_el = document.createElement("div");
    card_body_el.classList.add("card-body");
    card_body_el.id = `converter-${id}`;
    card_body_el.innerHTML = converter_html(input, output);

    card_el.appendChild(card_header_el);
    card_el.appendChild(card_body_el);
    card_el.appendChild(card_footer_el);

    card_el_wrapper.appendChild(card_el);
    return card_el_wrapper;
}

function isInputsEmpty(inputs) {
    return isEmptyObject(inputs.owned) && isEmptyObject(inputs.donations);
}

function toggle_upgrade(card_info) {
    const card = get_card(card_info);
    const u_state = !card.upgraded;
    card.upgraded = u_state;

    if (card.converters.length > 1) {
        let is_owned = false;
        for (let i = 0; i < card.converters.length; i++) {
            const converter = card.converters[i];
            if (converter.owned) is_owned = true;

            if (isInputsEmpty(converter.input) && (is_owned || !u_state) && i > 0) {
                converter.owned = u_state;
            }
        }
    }

    render_cards();

    if (card.converters.some(c => c.running)) {
        update_score();
    }
}

/**
 * Toggles whether a converter is running or not.
 * 
 * Modifies active_cards to add or remove card objects 
 */
function toggle_converter(converter_info) {
    let card = get_card(converter_info);
    let converter = card.converters[converter_info.converter_idx];
    const faction_id = converter_info.faction_id;
    const card_id = converter_info.card_id;

    let r_state = !converter.running;
    converter.running = r_state;
    if (r_state) {
        if (!(faction_id in active_cards)) {
            active_cards[faction_id] = {};
        }
        if (!Object.keys(active_cards[faction_id]).includes(card_id)) {
            active_cards[faction_id][card_id] = card;
        }
    } else {
        if (card.converters.filter(c => c.running).length == 0) {
            delete active_cards[faction_id][card_id];
        }
    }

    render_cards();
    update_score();
}

/* Start card selector */

// card_selector.addEventListener('hide.bs.modal', event => { modal_card_contianer.innerHTML = ''; })

function render_add_card_modal() {
    cards_to_add.clear();
    let curr_faction = add_card_faction_select.value;
    add_card_dropdown_container.innerHTML = "";
    add_card_dropdown_container.appendChild(dropdown_card("Starting", "add-card-dropdown-starting", [], curr_faction === faction_select.value));
    add_card_dropdown_container.appendChild(dropdown_card("Tier 1", "add-card-dropdown-tier1", [], false));
    add_card_dropdown_container.appendChild(dropdown_card("Tier 2", "add-card-dropdown-tier2", [], false));
    add_card_dropdown_container.appendChild(dropdown_card("Tier 3", "add-card-dropdown-tier3", [], false));
    add_card_dropdown_container.appendChild(dropdown_card("Misc", "add-card-dropdown-misc", [], false));

    const faction_data = all_cards[curr_faction];
    for (const key of ["tech_cards", "unique_cards", "starting_cards"]) {
        if (!(key in faction_data)) {
            continue;
        }
        for (let [card_id, card] of Object.entries(faction_data[key])) {
            let dropdown_el = get_converter_dropdown(add_card_faction_select, curr_faction, card_id, "add-");
            const card_name_suffixes = card.converters.length > 1;
            card.converters.forEach((converter, index) => {
                if (converter.owned) {
                    return;
                }
                const base_name = card.upgraded ? card.upgrade_name : card.name;
                const card_name = card_name_suffixes ? `${base_name} ${String.fromCharCode(65 + index)}` : base_name;
                const converter_info = {
                    faction_id: curr_faction,
                    card_category: key,
                    card_id: card_id,
                    converter_idx: index
                };
                const card_footer_el = create_add_card_footer(converter_info);
                dropdown_el.children[0].appendChild(create_card_element(converter_info, card_name, card.upgraded, converter, card_footer_el));
            });
        }
    }
}

function add_cards() {
    cards_to_add.forEach((path) => {
        const ttl = document.getElementById(`${path}-ttl`).value;
        const [faction_id, card_category, card_id, converter_index] = path.split("/");
        const converter = all_cards[faction_id][card_category][card_id]["converters"][converter_index]
        converter.ttl = ttl;
        converter.owned = true;
    });
    cards_to_add.clear();
    render_cards();
    add_card_modal.hide();
}

/* End card selector */

/* Start Dropdowns */
function dropdown_card(title, id, cards, collapsed) {
    let card_body_element = document.createElement("div");
    card_body_element.classList.add("card-body", "collapse");
    if (!collapsed) {
        card_body_element.classList.add("show");
    }
    card_body_element.id = id;
    let card_container = card_body_element.appendChild(document.createElement("div"));
    card_container.classList.add("row", "row-cols-lg-3", "row-cols-md-2", "row-cols-sm-1", "row-cols-1", "g-2");

    // for (let [id, card_data] of cards) {
    //     const card_name_suffixes = card_data.converters.length > 1;
    //     card_data.converters.forEach((converter, index) => {
    //         const card_name = card_name_suffixes ? `${card_data.name} ${String.fromCharCode(65 + index)}` : card_data.name;
    //
    //         const card_footer_el = create_owned_card_footer(id);
    //         card_container.appendChild(create_card_element(id, card_name, converter.input, converter.output, card_footer_el));
    //     });
    // }

    let card_element = document.createElement("div");
    card_element.classList.add("row", "card", "card-dropdown");
    card_element.innerHTML = `
    <div class="card-header ${collapsed ? "collapsed" : ""} d-flex " data-bs-toggle="collapse" data-bs-target="#${id}" aria-expanded="false" aria-controls="collapse-${id}">
            <span class="float-start"><strong>${title}</strong></span>
            <i class="ms-auto align-content-center fa-solid fa-chevron-right"></i>
            <i class="ms-auto align-content-center fa-solid fa-chevron-down"></i>
        </div>
    `;
    card_element.appendChild(card_body_element);
    return card_element;
}
/* End Dropdowns */

function get_converter_dropdown(faction_select, faction_id, card_id, dropdown_prefix = "") {
    if (faction_id != faction_select.value || card_id.startsWith("unique")) {
        return document.getElementById(`${dropdown_prefix}card-dropdown-misc`);
    }
    if (card_id.startsWith("starting")) {
        return document.getElementById(`${dropdown_prefix}card-dropdown-starting`);
    }
    const tier = Array.from(card_id)[0];
    return document.getElementById(`${dropdown_prefix}card-dropdown-tier${tier}`);
}

function render_cards() {
    card_dropdown_starting.innerHTML = "";
    card_dropdown_t1.innerHTML = "";
    card_dropdown_t2.innerHTML = "";
    card_dropdown_t3.innerHTML = "";
    card_dropdown_misc.innerHTML = "";
    for (let [faction_id, faction_data] of Object.entries(all_cards)) {
        for (const key of ["tech_cards", "unique_cards", "starting_cards"]) {
            if (!(key in faction_data)) {
                continue;
            }
            for (let [card_id, card] of Object.entries(faction_data[key])) {
                let dropdown_el = get_converter_dropdown(faction_select, faction_id, card_id);
                const card_name_suffixes = card.converters.length > 1;
                card.converters.forEach((converter, index) => {
                    if (!converter.owned) {
                        return;
                    }
                    const base_name = card.upgraded ? card.upgrade_name : card.name;
                    const card_name = card_name_suffixes ? `${base_name} ${String.fromCharCode(65 + index)}` : base_name;
                    const converter_info = {
                        faction_id: faction_id,
                        card_category: key,
                        card_id: card_id,
                        converter_idx: index
                    };
                    const card_footer_el = create_owned_card_footer(converter_info);
                    dropdown_el.children[0].appendChild(create_card_element(converter_info, card_name, card.upgraded, converter, card_footer_el));
                });
            }
        }
    }
}

function main() {
    white.addEventListener("input", update_score);
    brown.addEventListener("input", update_score);
    green.addEventListener("input", update_score);
    wsmall.addEventListener("input", update_score);
    black.addEventListener("input", update_score);
    blue.addEventListener("input", update_score);
    yellow.addEventListener("input", update_score);
    wlarge.addEventListener("input", update_score);
    ultratech.addEventListener("input", update_score);
    ships.addEventListener("input", update_score);
    vips.addEventListener("input", update_score);
    create_faction_options();
    create_card_dropdowns();
    faction_select.addEventListener("input", create_starting_converters);
    create_starting_converters();
    update_score();
    card_selector.addEventListener('show.bs.modal', render_add_card_modal);
    document.getElementById("add-card-confirm").addEventListener('click', add_cards);
    add_card_faction_select.addEventListener("input", render_add_card_modal);
    // let c = Object.entries(data[faction_select.value].tech_cards)[0];
    // card_dropdown_container.appendChild(card_dropdown("chom", "chom-collapse", "no_data"));
}

const white = document.getElementById("white-input");
const brown = document.getElementById("brown-input");
const green = document.getElementById("green-input");
const black = document.getElementById("black-input");
const blue = document.getElementById("blue-input");
const yellow = document.getElementById("yellow-input");
const ultratech = document.getElementById("ultratech-input");
const ships = document.getElementById("ships-input");
const vips = document.getElementById("vp-input");
const score_text = document.getElementById("score");
const faction_select = document.getElementById("faction-select");
const card_container = document.getElementById("card-container");
const gain_smalls = document.getElementById("gn-smalls");
const gain_larges = document.getElementById("gn-larges");
const gain_other = document.getElementById("gn-other");
const net_smalls = document.getElementById("nt-smalls");
const net_larges = document.getElementById("nt-larges");
const net_other = document.getElementById("nt-other");
const net_gain_toggle = document.getElementById("net-gain-toggle");
const net_holder = document.getElementById("nt-net-holder");
const gain_holder = document.getElementById("nt-gain-holder");
let data;

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
    data = await output.json();
}

(() => {
    getData().then(() => {
        console.log('loaded data');
        main();
    });
})()


function generate_rotting_totals() {
    return {
        white: parseInt(white.value),
        brown: parseInt(brown.value),
        green: parseInt(green.value),
        black: parseInt(black.value),
        yellow: parseInt(yellow.value),
        blue: parseInt(blue.value),
        ultratech: parseInt(ultratech.value),
        ships: parseInt(ships.value),
        vp: parseInt(vips.value)
    };
}

function add_totals(t1, t2) {
    return {
        white: (t1.white ? t1.white : 0) + (t2.white ? t2.white : 0),
        brown: (t1.brown ? t1.brown : 0) + (t2.brown ? t2.brown : 0),
        green: (t1.green ? t1.green : 0) + (t2.green ? t2.green : 0),
        black: (t1.black ? t1.black : 0) + (t2.black ? t2.black : 0),
        yellow: (t1.yellow ? t1.yellow : 0) + (t2.yellow ? t2.yellow : 0),
        blue: (t1.blue ? t1.blue : 0) + (t2.blue ? t2.blue : 0),
        ultratech: (t1.ultratech ? t1.ultratech : 0) + (t2.ultratech ? t2.ultratech : 0),
        ships: (t1.ships ? t1.ships : 0) + (t2.ships ? t2.ships : 0),
        vp: (t1.vp ? t1.vp : 0) + (t2.vp ? t2.vp : 0)
    };
}

function sub_totals(t1, t2) {
    return {
        white: (t1.white ? t1.white : 0) - (t2.white ? t2.white : 0),
        brown: (t1.brown ? t1.brown : 0) - (t2.brown ? t2.brown : 0),
        green: (t1.green ? t1.green : 0) - (t2.green ? t2.green : 0),
        black: (t1.black ? t1.black : 0) - (t2.black ? t2.black : 0),
        yellow: (t1.yellow ? t1.yellow : 0) - (t2.yellow ? t2.yellow : 0),
        blue: (t1.blue ? t1.blue : 0) - (t2.blue ? t2.blue : 0),
        ultratech: (t1.ultratech ? t1.ultratech : 0) - (t2.ultratech ? t2.ultratech : 0),
        ships: (t1.ships ? t1.ships : 0) - (t2.ships ? t2.ships : 0),
        vp: (t1.vp ? t1.vp : 0) - (t2.vp ? t2.vp : 0)
    };
}

function calculate_score(totals) {
    let smalls = totals.white + totals.brown + totals.green + totals.ships;
    let larges = totals.black + totals.blue + totals.yellow;
    let vp = totals.vp + Math.floor(smalls / 6) + Math.floor(larges / 4) + Math.floor(totals.ultratech / 2);
    let partials = (smalls % 6) * 2 + (larges % 4) * 3 + (totals.ultratech % 2) * 6;

    vp += Math.floor(partials / 12);
    partials = partials % 12;

    return {
        vp: vp,
        partial: partials
    };
}

let active_cards = {};

function converter_to_totals(data, upgraded) {
    let outputs = upgraded ? data.upgrade_output : data.output;
    return add_totals(outputs.owned, outputs.donations);
}

function converter_inputs_to_totals(data, upgraded) {
    let inputs = upgraded ? data.upgrade_input : data.input;
    return add_totals(inputs.owned, inputs.donations);
}

function generate_card_totals() {
    let totals = {}
    for (let card of Object.values(active_cards)) {
        if (card.running) {
            totals = add_totals(totals, converter_to_totals(card.data, card.upgraded));
        }
    }
    return totals;
}

function count_card_inputs() {
    let totals = {};
    for (let card of Object.values(active_cards)) {
        if (card.running) {
            totals = add_totals(totals, converter_inputs_to_totals(card.data, card.upgraded));
        }
    }
    return totals;
}

function format_smalls(total) {
    return `${total.green ?? 0} green, ${total.brown ?? 0} brown, ${total.white ?? 0} white`;
}

function format_larges(total) {
    return `${total.blue ?? 0} blue, ${total.yellow ?? 0} yellow, ${total.black ?? 0} black`;
}

function format_other(total) {
    return `${total.ultratech ?? 0} ultratech, ${total.ships ?? 0} ships, ${total.vp ?? 0} vp`;
}

let calc_net = false;

function update_score() {
    let rotting = generate_rotting_totals();
    let cards = generate_card_totals();
    let total = add_totals(rotting, cards);

    let score = calculate_score(total);

    score_text.innerText = `Final Score: ${score.vp} + ${score.partial}/12`;

    gain_smalls.innerText = format_smalls(total);
    gain_larges.innerText = format_larges(total);
    gain_other.innerText = format_other(total);

    let inputs = count_card_inputs();
    let net = sub_totals(total, inputs);

    net_smalls.innerText = format_smalls(net);
    net_larges.innerText = format_larges(net);
    net_other.innerText = format_other(net);
}

function create_faction_options() {
    for (let faction of Object.values(data)) {
        let option = document.createElement("option");
        option.value = faction.id;
        option.innerText = faction.name;
        faction_select.appendChild(option);
    }
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

function converter(input, output) {
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

function card(id, name, input, output) {
    return `
        <div class="col card converter text-center" id="card-${id}">
            <div class="card-header">
                <span class="converter-name" id="card-name-${id}">${name}</span>
            </div>
            <div class="card-body converter-display" id="converter-${id}">
                ${converter(input, output)}
            </div>
            <div class="card-footer">
                <button class="btn btn-light float-start" id="toggle-${id}">Mark Running</button>
                <button class="btn btn-light float-end" id="upgrade-${id}">Upgrade</button>
            </div>
        </div>
    `;
}


function toggle_upgrade(i) {
    let u_state = !active_cards[i].upgraded;
    active_cards[i].upgraded = u_state;
    let data = active_cards[i].data;
    let c_name = document.getElementById(`card-name-${i}`);
    let c_upgrade = document.getElementById(`upgrade-${i}`);
    let c_display = document.getElementById(`converter-${i}`);
    c_upgrade.innerText = u_state ? "Downgrade" : "Upgrade";
    c_name.innerText = u_state ? data.upgrade_name : data.name;
    c_display.innerHTML = converter(
        u_state ? data.upgrade_input : data.input,
        u_state ? data.upgrade_output : data.output
    );

    if (active_cards[i].running) {
        update_score();
    }
}
function toggle_card(i) {
    let r_state = !active_cards[i].running;
    active_cards[i].running = r_state;
    let data = active_cards[i].data;
    let c_toggle = document.getElementById(`toggle-${i}`);
    let c = document.getElementById(`card-${i}`);
    c_toggle.innerText = r_state ? "Unmark Running" : "Mark Running";
    if (r_state) {
        c.classList.add('running');
    } else {
        c.classList.remove('running');
    }
    update_score();
}

function create_faction_converters() {
    let curr_faction = faction_select.value;
    card_container.innerHTML = '';
    if (data[curr_faction].tech_cards) {
        let i = 0;
        for (let [id, card_data] of Object.entries(data[curr_faction].tech_cards)) {
            let card_element = document.createElement('div');
            card_element.className = 'col';
            card_element.innerHTML = card(id, card_data.name, card_data.input, card_data.output);
            card_container.appendChild(card_element);

            let upgrade_button = document.getElementById(`upgrade-${id}`);
            upgrade_button.onclick = toggle_upgrade.bind(null, id);
            let toggle_button = document.getElementById(`toggle-${id}`);
            toggle_button.onclick = toggle_card.bind(null, id);

            active_cards[id] = {
                data: card_data,
                upgraded: false,
                running: false
            };

            i++;
        }
    }
    // add an "add card" card at the end of the grid
    let card_element = document.createElement('div');
    card_element.setAttribute("data-bs-toggle", "modal")
    card_element.setAttribute("data-bs-target", "#card_selector")
    card_element.className = 'col';
    card_element.innerHTML = `
        <div class="col card" id="add-card">
            <h2>+ Add Card</h2>
        </div>
    `;
    card_container.appendChild(card_element);
}

/* Start card selector */
window.addEventListener("DOMContentLoaded", (event) => {
    const card_selector = document.getElementById('card_selector');
    const modal_card_contianer = document.getElementById('modal_card_container');
    card_selector.addEventListener('show.bs.modal', event => {
        let id = "test-id";
        let name = "chom";
        let input = {owned:{yellow: 1}};
        let output = {owned:{brown: 3}};
        let card_element = document.createElement('div');
        card_element.className = 'col';
        card_element.innerHTML = `
            <div class="col card converter text-center" id="card-${id}">
                <div class="card-header">
                    <span class="converter-name" id="card-name-${id}">${name}</span>
                </div>
                <div class="card-body converter-display" id="converter-${id}">
                    ${converter(input, output)}
                </div>
                <div class="card-footer">
                    <button class="btn btn-light float-end" id="select-${id}">Select</button>
                </div>
            </div>
        `;
        modal_card_container.appendChild(card_element);
        
    });

    card_selector.addEventListener('hide.bs.modal', event => { modal_card_contianer.innerHTML = ''; })
});

/* End card selector */


function toggle_net() {
    if (calc_net) {
        net_holder.hidden = true;
        gain_holder.hidden = false;
        net_gain_toggle.innerText = "Calculate Net Resources";
    } else {
        net_holder.hidden = false;
        gain_holder.hidden = true;
        net_gain_toggle.innerText = "Calculate Resource Counts";
    }
    calc_net = !calc_net;
}

function main() {
    white.oninput = update_score;
    brown.oninput = update_score;
    green.oninput = update_score;
    black.oninput = update_score;
    blue.oninput = update_score;
    yellow.oninput = update_score;
    ultratech.oninput = update_score;
    ships.oninput = update_score;
    vips.oninput = update_score;
    create_faction_options();
    faction_select.oninput = create_faction_converters;
    create_faction_converters();
    net_gain_toggle.onclick = toggle_net;
    update_score();
}

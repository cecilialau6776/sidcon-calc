let fs = require("fs");

let file = fs.readFileSync("factions.json");
let data = JSON.parse(file);

let card_data = [];


/* 
 * This is used to parse the factions.json file into something usable by the site
 * factions.json should be the only file manually edited.
 * 
 * Converters in factions.json use a condensed format, with colors being as follows:
 * w: white
 * g: green
 * b: brown
 * x: wild small
 * a: any small (the wild eni et converter inputs)
 * Y: yellow
 * C: blue
 * K: black
 * X: wild large
 * A: any large
 * U: ultratech
 * s: ship
 * V: VP
 *
 * No planet eating is supported rn but if that becomes a thing its:
 * p: planet
 * d: desert planet
 * i: ice planet
 * j: jungle planet
 * o: ocean planet
 *
 * Anything after 'D' is treated as a donation.
 * 
 * Converters are split into the base output and the upgraded delta
 * anything after '-' in a delta is removed from the output
 *
 * I don't think its relavent to the vanilla game BUT donations take precedent over subtractions.
 * So 1w-1sD1Y-1g would be how to write a converter that upgrades to replace an owned ship
 * with a white and a dontation green with a dontation yellow
 *
 * */

function default_resources() {
    return {
        white: 0,
        green: 0,
        brown: 0,
        wsmall: 0,
        asmall: 0,
        yellow: 0,
        blue: 0,
        black: 0,
        wlarge: 0,
        alarge: 0,
        ultratech: 0,
        vp: 0,
        ships: 0,
    }
}

function parse_resources(str) {
    let count = 0;
    let donations = false;
    let negative = 1;
    let output = {};
    let curr = default_resources(); 
    for(let i = 0; i < str.length; i++) {
        let c = str[i];
        if(c >= '0' && c <= '9') {
            count = (count * 10) + parseInt(c);
        } else {
            switch(c) {
                case 'w':
                    curr.white = negative * count;
                    break;
                case 'g':
                    curr.green = negative * count;
                    break;
                case 'b':
                    curr.brown = negative * count;
                    break;
                case 'x':
                    curr.wsmall = negative * count;
                    break;
                case 'a':
                    curr.asmall = negative * count;
                case 'Y':
                    curr.yellow = negative * count;
                    break;
                case 'C':
                    curr.blue = negative * count;
                    break;
                case 'K':
                    curr.black = negative * count;
                    break;
                case 'X':
                    curr.wlarge = negative * count;
                    break;
                case 'A':
                    curr.alarge = negative * count;
                    break
                case 'U':
                    curr.ultratech = negative * count;
                    break;
                case 'V':
                    curr.vp = negative * count;
                    break;
                case 's':
                    curr.ships = negative * count;
                    break;
                case 'D':
                    donations = true;
                    negative = 1;
                    output.owned = curr;
                    curr = default_resources();
                    break;
                case '-':
                    negative = -1;
                    break;
            }
            count = 0;
        }
    }
    
    if(donations) {
        output.donations = curr;
    } else {
        output.donations = default_resources();
        output.owned = curr;
    }

    return output;
}

function add_inner_res(res1, res2) {
    return {
        white: res1.white + res2.white,
        brown: res1.brown + res2.brown,
        green: res1.green + res2.green,
        wsmall: res1.wsmall + res2.wsmall,
        asmall: res1.asmall + res2.asmall,
        black: res1.black + res2.black,
        yellow: res1.yellow + res2.yellow,
        blue: res1.blue + res2.blue,
        wlarge: res1.wlarge + res2.wlarge,
        alarge: res1.alarge + res2.alarge,
        ultratech: res1.ultratech + res2.ultratech,
        ships: res1.ships + res2.ships,
        vp: res1.vp + res2.vp
    };
}

function add_resources(res1, res2) {
    let output = {
        owned: add_inner_res(res1.owned, res2.owned),
        donations: add_inner_res(res1.donations, res2.donations)
    };

    return output;
}

function resources_value(res) {
    let smalls = res.white + res.brown + res.green + res.wsmall + res.ships;
    let larges = res.blue + res.black + res.yellow + res.wlarge;
    return smalls * 2 + larges * 3 + res.ultratech * 6 + res.vp * 12;
}

function truncate_resources(res) {
    for(let [k, v] of Object.entries(res.owned)) {
        if(v == 0) {
            delete res.owned[k];
        }
    }

    for(let [k, v] of Object.entries(res.donations)) {
        if(v == 0) {
            delete res.donations[k];
        }
    }
}

for(let [id, card] of Object.entries(data["tech-cards"])) {
    let input = parse_resources(card[2]);
    card_data[id] = {
        name: card[0],
        upgrade_name: card[1],
        input: input,
        upgrade_input: input
    };
}

let factions = {};

for(let faction of data.factions) {
    if(faction['unique-cards']) {
        faction.starting_cards = [];
        faction.unique_cards = [];

        for(let card of faction['unique-cards']) {
            let converters = [];
            let upgrade_converters = [];
            let placement_converters = [];
            for(let converter of card.converters) {
                let input = parse_resources(converter.inputs);
                let output = parse_resources(converter.outputs[0]);
                let delta = parse_resources(converter.outputs[1]);
                let upgrade_output = add_resources(output, delta);
                converter.input = input;
                if(converter["upgrade-inputs"]) {
                    let delta = parse_resources(converter['upgrade-inputs']);
                    converter.upgrade_input = add_resources(input, delta);
                } else {
                    converter.upgrade_input = input;
                }
                converter.output = output;
                converter.upgrade_output = upgrade_output;
                truncate_resources(converter.input);
                truncate_resources(converter.upgrade_input);
                truncate_resources(converter.output);
                truncate_resources(converter.upgrade_output);
                delete converter.inputs;
                delete converter.outputs;
                converters.push(converter);
            }

            if(card['upgrade-converters']) {
                for(let converter of card['upgrade-converters']) {
                    let input = parse_resources(converter.inputs);
                    let output = parse_resources(converter.outputs);
                    converter.input = input;
                    converter.output = output;
                    truncate_resources(converter.input);
                    truncate_resources(converter.output);
                    delete converter.inputs;
                    delete converter.outputs;
                    upgrade_converters.push(converter);
                }
            }

            if(card['placement-converters']) {
                for(let converter of card['placement-converters']) {
                    let input = parse_resources(converter.inputs);
                    let output = parse_resources(converter.outputs);
                    converter.input = input;
                    converter.output = output;
                    truncate_resources(converter.input);
                    truncate_resources(converter.output);
                    delete converter.inputs;
                    delete converter.outputs;
                    placement_converters.push(converter);
                }
            }

            if(card['upgrade-cards']) {
                card.upgrade_cards = card['upgrade-cards'];
                delete card['upgrade-cards'];
            }

            card.converters = converters;
            card.upgrade_converters = upgrade_converters;
            card.placement_converters = placement_converters;
            card.upgrade_name = card['upgrade-name'];
            delete card['upgrade-name'];
            delete card['upgrade-converters'];
            delete card['placement-converters'];

            if(card.starting) {
                faction.starting_cards.push(card);
            } else {
                faction.unique_cards.push(card);
            }
        }
        delete faction['unique-cards'];
    } 

    factions[faction.id] = faction;
}

for(let [species, species_data] of Object.entries(data.species)) {
    let faction_cards = {};
    for(let [id, outputs] of Object.entries(species_data.outputs)) {
        let card = structuredClone(card_data[id]);
        let output = parse_resources(outputs[0]);
        let upgrade_delta = parse_resources(outputs[1]);
        let upgrade_output = add_resources(output, upgrade_delta);
        card.output = output;
        card.upgrade_output = upgrade_output;

        if(species_data['upgrade-inputs'][id]) {
            let delta = parse_resources(species_data['upgrade-inputs'][id]);
            let new_inputs = add_resources(card.upgrade_input, delta);
            card.upgrade_input = new_inputs;
        }

        truncate_resources(card.input);
        truncate_resources(card.upgrade_input);
        truncate_resources(card.output);
        truncate_resources(card.upgrade_output);

        faction_cards[id] = card;
    }
    factions[`base-${species}`].tech_cards = faction_cards;
    factions[`alt-${species}`].tech_cards = faction_cards;
}

fs.writeFileSync("output.json", JSON.stringify(factions, null, 4));

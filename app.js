const Axios = require('axios');
const Cheerio = require('cheerio');
const SteamID = require('steamid');

async function main(ID) {
    const playerData = await getPlayerData(ID);

    process.stdout.write('{ ' + playerData.name + ': ');

    const performance = await getExpectedPerformance(ID);

    process.stdout.write(performance + ' => ');

    const topHeroes = await getTopHeroes(ID);

    topHeroes.forEach((hero) => {
        process.stdout.write('(' + hero.id + ': ' + hero.ep + '), ');
    })

    process.stdout.write('(Lang: ' + playerData.lang + ') }');
    lines(1);
}

async function getPlayerData(ID) {
    var playerData = {
        name: '',
        lang: '',
    };

    const response = await Axios.get('https://api.stratz.com/api/v1/Player/' + ID);

    playerData.name = response.data.name;
    playerData.lang = response.data.languageCode[0];

    return playerData;
}

async function getExpectedPerformance(ID) {
    const response = await Axios.get('https://api.stratz.com/api/v1/Player/' + ID + '/performance');

    performance = calculatePerformance(response.data);

    return performance;
}

async function getTopHeroes(ID) {
    var topHeroes = [];
    var topFiveHeroes = [];
    var heroNames = [];

    const response = await Axios.get('https://api.stratz.com/api/v1/Player/' + ID + '/heroPerformance');

    response.data.forEach((hero) => {
        performance = calculatePerformance(hero);

        if ((hero.matchCount >= 10) && (performance >= 50)) {

            var heroData = {
                id: hero.heroId,
                ep: performance,
            };

            topHeroes.push(heroData);
        }
    });

    topHeroes.sort((a, b) => {
        return b.ep - a.ep;
    });

    for (var i = 0; i < 5; i++) {
        topFiveHeroes.push(topHeroes[i]);
    }

    heroNames = await findHero(topFiveHeroes);

    var i = 0;
    topFiveHeroes.forEach((hero) => {
        hero.id = heroNames[i];
        i++;
    });

    return topFiveHeroes;
}

async function findHero(heroId) {
    heroNames = [];
    const response = await Axios.get('https://api.stratz.com/api/v1/Hero');

    var i = 0;
    heroId.forEach((id) => {
        heroNames.push(response.data[heroId[i].id].displayName);
        i++;
    });

    return heroNames;
}

// ---------------------------------------------------------------------------------------------------

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

readline.question('Enter steamcommunity links (seperated by comma with no space):\n', async (AccountWebpageURL) => {
    lines(5);
    var accoutArray = AccountWebpageURL.split(',');

    for (var i = 0; i < accoutArray.length; i++) {
        var html = await loadWebpage(accoutArray[i]);
        var ID = await getAccountID(html);
        var steamid3 = (new SteamID(ID)).accountid;
        await main(steamid3);
    }
    await lines(6);
    readline.close();
});

async function loadWebpage(URL) {
    const { data: html } = await Axios.get(URL);
    return html;
}

async function getAccountID(html) {
    const $ = Cheerio.load(html);
    const htmlString = $('[class="responsive_page_template_content"]').html().substr(0, 300);
    const sIndex = htmlString.search("steamid") + 10;
    const eIndex = htmlString.search("personaname") - 3;
    const ID = (htmlString.substring(sIndex, eIndex));
    return ID;
}

// ---------------------------------------------------------------------------------------------------
function calculatePerformance(response) {
    var winCount = response.winCount;
    var matchCount = response.matchCount;
    var winRate = winCount / matchCount;
    var imp = response.imp;
    var performance = winRate * imp;
    performance = parseFloat(Math.round(performance * 100) / 100).toFixed(2);
    return performance;
}

function lines(n) {
    for (var i = 0; i < n; i++) {
        console.log();
    }
}
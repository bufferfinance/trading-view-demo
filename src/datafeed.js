import { makeApiRequest, generateSymbol, parseFullSymbol } from "./helpers.js";
import { subscribeOnStream, unsubscribeFromStream } from "./streaming.js";

const lastBarsCache = new Map();

const configurationData = {
	supported_resolutions: ["4H", "1D", "1W", "1M"],
	exchanges: [
		{
			value: "Buffer",
			name: "Buffer",
			desc: "Buffer Finance",
		},
	],
	symbols_types: [
		{
			name: "crypto",

			// `symbolType` argument for the `searchSymbols` method, if a user selects this symbol type
			value: "crypto",
		},
		// ...
	],
};

async function getAllSymbols() {
	const data = await makeApiRequest("data/v3/all/exchanges");
	let allSymbols = [
		{
			symbol: 'ETHUSD',
			full_name: "ETH_USD",
			description: 'ETHUSD',
			exchange: 'Buffer',
			type: 'crypto'
		}
	];


	return allSymbols;
}

export default {
	onReady: (callback) => {
		// set configs.
		setTimeout(() => callback(configurationData));
	},

	searchSymbols: async (
		userInput,
		exchange,
		symbolType,
		onResultReadyCallback
	) => {
		console.log(
			"[-] Search Symbols",
			userInput,
			exchange,
			symbolType,
			onResultReadyCallback
		);
		const symbols = await getAllSymbols();
		const newSymbols = symbols.filter((symbol) => {
			const isExchangeValid = exchange === "" || symbol.exchange === exchange;
			const isFullSymbolContainsInput =
				symbol.full_name.toLowerCase().indexOf(userInput.toLowerCase()) !== -1;
			return isExchangeValid && isFullSymbolContainsInput;
		});
		onResultReadyCallback(newSymbols);
	},

	resolveSymbol: async (
		symbolName,
		onSymbolResolvedCallback,
		onResolveErrorCallback
	) => {

		// const symbols = await getAllSymbols();
		// const symbolItem = symbols.find(
		// 	({ full_name }) => full_name === symbolName
		// );
		// if (!symbolItem) {
		// 	onResolveErrorCallback("cannot resolve symbol");
		// 	return;
		// }
		const symbolInfo = {
			ticker: 'ETHUSD',
			name: 'ETHUSD',
			description: 'ETHUSD',
			type: 'crypto',
			session: "24x7",
			timezone: "Etc/UTC",
			exchange: "Buffer",
			minmov: 1,
			pricescale: 100,
			has_intraday: true,
			has_no_volume: true,
			has_weekly_and_monthly: false,
			supported_resolutions: ['4H', '1D'],
			volume_precision: 2,
			data_status: "streaming",
		};

		onSymbolResolvedCallback(symbolInfo);
	},

	getBars: async (
		symbolInfo,
		resolution,
		periodParams,
		onHistoryCallback,
		onErrorCallback
	) => {
		const { from, to, firstDataRequest } = periodParams;
		const parsedSymbol = parseFullSymbol(symbolInfo.full_name);


		try {
			const tempData = await fetch(
				`https://api-v2.buffer.finance/binary/ETH/tickers?environment=mumbai-test`
			);
			const d = await tempData.json();


			const data = await makeApiRequest(`data/histoday?${query}`);

			let bars = [];
			const n = d.length;
			console.log(from, "from");
			console.log(to, "to");

			d.forEach((bar, idx) => {
				if (bar.time >= from && bar.time < to) {
					bars = [
						...bars,
						{
							time: bar.time * 1000,
							low: bar.low,
							isBarClosed: idx < n - 1 ? true : false,
							isLastBar: idx == n - 1 ? true : false,
							high: bar.high,
							open: bar.open,
							close: bar.close,
						},
					];
				}
			});

			// if (firstDataRequest) {
			if (bars.length)
				lastBarsCache.set(symbolInfo.full_name, {
					...bars[bars.length - 1],
				});

			// }
			onHistoryCallback(bars, {
				noData: false,
			});
		} catch (error) {
			onErrorCallback(error);
		}
	},

	subscribeBars: (
		symbolInfo,
		resolution,
		onRealtimeCallback,
		subscribeUID,
		onResetCacheNeededCallback
	) => {
		setInterval(async () => {
			const lastBlock = lastBarsCache.get(symbolInfo.full_name);

			const data = await fetch(
				"https://api-v2.buffer.finance/binary/ETH/tickers/latest?environment=mumbai-test"
			);
			const latestData = await data.json();
			let updatedBlock = {
				close: latestData.close,
				high: latestData.high,
				low: latestData.low,
				open: lastBlock.open,
				time: lastBlock.time,
			};

			onRealtimeCallback(updatedBlock);
		}, 1000);
		// console.log(`symbolInfo,
		// resolution,
		// onRealtimeCallback,
		// subscribeUID,
		// onResetCacheNeededCallback,: `, symbolInfo,
		// 	resolution,
		// 	onRealtimeCallback,
		// 	subscribeUID,
		// 	onResetCacheNeededCallback);

		// subscribeOnStream(
		// 	symbolInfo,
		// 	resolution,
		// 	onRealtimeCallback,
		// 	subscribeUID,
		// 	onResetCacheNeededCallback,
		// 	lastBarsCache.get(symbolInfo.full_name),
		// );
	},

	unsubscribeBars: (subscriberUID) => {
		unsubscribeFromStream(subscriberUID);
	},
};

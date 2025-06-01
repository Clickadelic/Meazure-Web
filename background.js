// background.js

chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: "start-measure",
		title: "Start Measure Mode",
		contexts: ["all"]
	})
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
	if (info.menuItemId === "start-measure" && tab.id) {
		chrome.scripting.executeScript({
			target: { tabId: tab.id },
			function: () => {
				window.dispatchEvent(new CustomEvent("startMeasureMode"))
			}
		})
	}
})

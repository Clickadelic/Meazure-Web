let overlay, startX, startY, rulerLine
let dragTarget = null
let dragOffsetX = 0
let dragOffsetY = 0

window.toggleRuler = function () {
	if (overlay) {
		overlay.remove()
		overlay = null
		return
	}

	overlay = document.createElement("div")
	overlay.id = "meazure-overlay"
	overlay.innerHTML = `<div id="meazure-crosshair"></div>`
	document.body.appendChild(overlay)

	document.addEventListener("mousemove", handleMouseMove)
	document.addEventListener("mousedown", startMeasure)
	document.addEventListener("mouseup", endMeasure)

	document.addEventListener("mousedown", onDragStart)
}

function handleMouseMove(e) {
	const cross = document.getElementById("meazure-crosshair")
	cross.style.left = e.clientX + "px"
	cross.style.top = e.clientY + "px"
	cross.innerText = `X: ${e.clientX}, Y: ${e.clientY}`

	if (rulerLine && startX != null && startY != null) {
		rulerLine.style.width = Math.abs(e.clientX - startX) + "px"
		rulerLine.style.height = Math.abs(e.clientY - startY) + "px"
		rulerLine.style.left = Math.min(e.clientX, startX) + "px"
		rulerLine.style.top = Math.min(e.clientY, startY) + "px"
		rulerLine.innerText = `${Math.abs(e.clientX - startX)}px`
	}
}

function startMeasure(e) {
	startX = e.clientX
	startY = e.clientY

	rulerLine = document.createElement("div")
	rulerLine.className = "ruler-box"
	overlay.appendChild(rulerLine)
}

function endMeasure() {
	startX = startY = null
	rulerLine = null
}

function onDragStart(e) {
	if (!e.target.classList.contains("ruler-box")) return

	dragTarget = e.target
	const rect = dragTarget.getBoundingClientRect()
	dragOffsetX = e.clientX - rect.left
	dragOffsetY = e.clientY - rect.top

	document.addEventListener("mousemove", onDrag)
	document.addEventListener("mouseup", onDragEnd)
	// document.removeEventListener("mousedown", onDragStart) // NEU
}

// function onDrag(e) {
// 	if (!dragTarget) return

// 	dragTarget.style.left = e.clientX - dragOffsetX + "px"
// 	dragTarget.style.top = e.clientY - dragOffsetY + "px"
// }

// function onDragEnd() {
// 	document.removeEventListener("mousemove", onDrag)
// 	document.removeEventListener("mouseup", onDragEnd)
// 	dragTarget = null
// }

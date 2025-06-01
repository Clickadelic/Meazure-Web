let overlay = null
let isMeasuring = false
let startX = null
let startY = null
let rulerLine = null

let snapDistance = 10 // Abstand für Snap
let snapLines = []

let selectedRuler = null

let isDragging = false
let dragOffsetX = 0
let dragOffsetY = 0

// Setup Overlay & CSS
function init() {
	overlay = document.createElement("div")
	overlay.id = "meazure-overlay"
	Object.assign(overlay.style, {
		position: "fixed",
		top: 0,
		left: 0,
		width: "100vw",
		height: "100vh",
		zIndex: 9999999,
		pointerEvents: "auto",
		userSelect: "none"
	})
	document.body.appendChild(overlay)

	addGlobalStyles()
	overlay.addEventListener("mousedown", startMeasure)
	overlay.addEventListener("mousemove", onMouseMove)
	overlay.addEventListener("mouseup", onMouseUp)

	// Tastatur-Events für Verschieben mit Pfeiltasten / WASD
	window.addEventListener("keydown", onKeyDown)
}

function addGlobalStyles() {
	const style = document.createElement("style")
	style.textContent = `
    #meazure-overlay .ruler-box {
      position: absolute;
      border: 1px dotted limegreen;
      background: rgba(22, 119, 255, 0.15);
      box-sizing: border-box;
      user-select: none;
      cursor: move;
    }
    #meazure-overlay .ruler-box.selected {
      border-color: #1677ff;
      background: rgba(22, 119, 255, 0.3);
    }
    #meazure-overlay .ruler-close {
      position: absolute;
      top: -10px;
      right: -10px;
      width: 20px;
      height: 20px;
      background: #1677ff;
      color: white;
      font-weight: bold;
      border-radius: 50%;
      font-size: 16px;
      line-height: 20px;
      text-align: center;
      cursor: pointer;
      user-select: none;
      z-index: 10;
    }
    #meazure-overlay .ruler-resize-handle {
      position: absolute;
      width: 15px;
      height: 15px;
      right: 0;
      bottom: 0;
      cursor: se-resize;
      background: #1677ff;
      border-radius: 3px;
      z-index: 5;
    }
    #meazure-overlay .snap-line {
      position: absolute;
      background: #1677ff;
      opacity: 0.6;
      pointer-events: none;
      z-index: 10000000;
    }
    #meazure-overlay .snap-line.vertical {
      width: 1px;
      height: 100vh;
    }
    #meazure-overlay .snap-line.horizontal {
      height: 1px;
      width: 100vw;
    }
    #meazure-overlay .ruler-label {
      position: absolute;
      bottom: 2px;
      right: 12px;
      color: #1677ff;
      font-size: 12px;
	  background: #fff;
	  border: 1px solid #000;
	  border-radius: 3px;
	  padding: 2px;
      user-select: none;
      pointer-events: none;
      z-index: 10;
    }

	#meazure-overlay .ruler-resize-handle-top-left {
		position: absolute;
		width: 15px;
		height: 15px;
		top: 0;
		left: 0;
		cursor: nwse-resize;
		background: #1677ff;
		border-radius: 3px;
		z-index: 5;
	}
  `
	document.head.appendChild(style)
}

function startMeasure(e) {
	if (e.target.classList.contains("ruler-box") || e.target.classList.contains("ruler-close") || e.target.classList.contains("ruler-resize-handle") || e.target.classList.contains("snap-line")) return

	// Wenn schon ein Rechteck existiert, löschen wir es (inkl. Snap-Linien)
	if (selectedRuler) {
		selectedRuler.remove()
		selectedRuler = null
		clearSnapLines()
	}

	isMeasuring = true
	const pos = getSnappedPosition(e.clientX, e.clientY)
	startX = pos.x
	startY = pos.y

	rulerLine = document.createElement("div")
	rulerLine.className = "ruler-box"
	overlay.appendChild(rulerLine)
}

function onMouseMove(e) {
	if (isDragging && selectedRuler) {
		const pos = getSnappedPosition(e.clientX - dragOffsetX, e.clientY - dragOffsetY)

		selectedRuler.style.left = pos.x + "px"
		selectedRuler.style.top = pos.y + "px"

		updateRulerLabel(selectedRuler)
		updateSnapLines(selectedRuler)
		return
	}

	if (isMeasuring && rulerLine) {
		const pos = getSnappedPosition(e.clientX, e.clientY)

		const left = Math.min(pos.x, startX)
		const top = Math.min(pos.y, startY)
		const width = Math.abs(pos.x - startX)
		const height = Math.abs(pos.y - startY)

		rulerLine.style.left = left + "px"
		rulerLine.style.top = top + "px"
		rulerLine.style.width = width + "px"
		rulerLine.style.height = height + "px"

		updateRulerLabel(rulerLine)
		updateSnapLines(rulerLine)
	}
}

function onMouseUp(e) {
	if (isDragging) {
		isDragging = false
		return
	}
	if (isMeasuring) {
		endMeasure(e)
	}
}

function endMeasure(e) {
	if (!rulerLine) return

	// Minimum Größe abfragen (damit kein Mini-Kästchen)
	const w = rulerLine.offsetWidth
	const h = rulerLine.offsetHeight
	if (w < 5 || h < 5) {
		rulerLine.remove()
		rulerLine = null
		isMeasuring = false
		clearSnapLines()
		return
	}

	// Close-Button
	const closeBtn = document.createElement("div")
	closeBtn.className = "ruler-close"
	closeBtn.innerHTML = "×"
	closeBtn.addEventListener("click", ev => {
		ev.stopPropagation()
		if (rulerLine === selectedRuler) {
			selectedRuler = null
			clearSnapLines()
		}
		closeBtn.parentElement?.remove()
	})
	rulerLine.appendChild(closeBtn)

	// Resize-Handle unten rechts (bestehend)
	const handleBR = document.createElement("div")
	handleBR.className = "ruler-resize-handle"
	rulerLine.appendChild(handleBR)

	// Resize-Handle oben links (neu)
	const handleTL = document.createElement("div")
	handleTL.className = "ruler-resize-handle-top-left"
	rulerLine.appendChild(handleTL)

	// Resize unten rechts (bestehend)
	handleBR.addEventListener("mousedown", function (ev) {
		ev.stopPropagation()
		const box = handleBR.parentElement
		const startWidth = box.offsetWidth
		const startHeight = box.offsetHeight
		const startX = ev.clientX
		const startY = ev.clientY

		function doResize(e) {
			const newWidth = Math.max(5, startWidth + e.clientX - startX)
			const newHeight = Math.max(5, startHeight + e.clientY - startY)
			box.style.width = newWidth + "px"
			box.style.height = newHeight + "px"
			updateRulerLabel(box)
			updateSnapLines(box)
		}

		function stopResize() {
			document.removeEventListener("mousemove", doResize)
			document.removeEventListener("mouseup", stopResize)
		}

		document.addEventListener("mousemove", doResize)
		document.addEventListener("mouseup", stopResize)
	})

	// Resize oben links (neu)
	handleTL.addEventListener("mousedown", function (ev) {
		ev.stopPropagation()
		const box = handleTL.parentElement
		const startWidth = box.offsetWidth
		const startHeight = box.offsetHeight
		const startX = ev.clientX
		const startY = ev.clientY
		const startLeft = box.offsetLeft
		const startTop = box.offsetTop

		function doResize(e) {
			const deltaX = e.clientX - startX
			const deltaY = e.clientY - startY

			let newWidth = Math.max(5, startWidth - deltaX)
			let newHeight = Math.max(5, startHeight - deltaY)
			let newLeft = startLeft + deltaX
			let newTop = startTop + deltaY

			// Verhindern, dass Box nach rechts/unten "überläuft"
			if (newWidth === 5) newLeft = startLeft + (startWidth - 5)
			if (newHeight === 5) newTop = startTop + (startHeight - 5)

			box.style.width = newWidth + "px"
			box.style.height = newHeight + "px"
			box.style.left = newLeft + "px"
			box.style.top = newTop + "px"

			updateRulerLabel(box)
			updateSnapLines(box)
		}

		function stopResize() {
			document.removeEventListener("mousemove", doResize)
			document.removeEventListener("mouseup", stopResize)
		}

		document.addEventListener("mousemove", doResize)
		document.addEventListener("mouseup", stopResize)
	})

	// Drag aktivieren
	enableDragForBox(rulerLine)

	// Nach Erstellen auswählen
	selectedRuler = rulerLine
	highlightSelectedRuler()

	isMeasuring = false
	rulerLine = null
	startX = null
	startY = null
}

// Funktion zum Draggen
function enableDragForBox(box) {
	box.addEventListener("mousedown", ev => {
		if (ev.target.classList.contains("ruler-close") || ev.target.classList.contains("ruler-resize-handle")) return

		isDragging = true
		selectedRuler = box
		highlightSelectedRuler()

		dragOffsetX = ev.clientX - box.offsetLeft
		dragOffsetY = ev.clientY - box.offsetTop

		ev.preventDefault()
	})
}

function highlightSelectedRuler() {
	const allBoxes = overlay.querySelectorAll(".ruler-box")
	allBoxes.forEach(b => b.classList.remove("selected"))
	if (selectedRuler) {
		selectedRuler.classList.add("selected")
		updateSnapLines(selectedRuler)
	} else {
		clearSnapLines()
	}
}

// Snap-Position (mit Snap-Distanz)
function getSnappedPosition(x, y) {
	// Hier kannst du die Logik erweitern, z.B. Snap an andere Rechtecke oder Bildschirmkanten
	// Aktuell ohne echte Snapping-Logik, nur Rückgabe der Originalkoordinaten
	return { x, y }
}

// Snap-Linien anzeigen
function updateSnapLines(box) {
	clearSnapLines()

	if (!box) return

	const boxRect = box.getBoundingClientRect()

	// Beispiel: Snap-Linien an Bildschirmkanten
	addSnapLine("vertical", 0) // links
	addSnapLine("vertical", window.innerWidth) // rechts
	addSnapLine("horizontal", 0) // oben
	addSnapLine("horizontal", window.innerHeight) // unten

	// Snap-Linien an Box-Kanten (links, rechts, oben, unten)
	addSnapLine("vertical", boxRect.left)
	addSnapLine("vertical", boxRect.right)
	addSnapLine("horizontal", boxRect.top)
	addSnapLine("horizontal", boxRect.bottom)
}

function addSnapLine(type, pos) {
	const line = document.createElement("div")
	line.className = "snap-line " + type
	if (type === "vertical") {
		line.style.left = pos + "px"
		line.style.top = 0
	} else {
		line.style.top = pos + "px"
		line.style.left = 0
	}
	overlay.appendChild(line)
	snapLines.push(line)
}

function clearSnapLines() {
	snapLines.forEach(line => line.remove())
	snapLines = []
}

// Label auf der Box mit Breite x Höhe anzeigen
function updateRulerLabel(box) {
	let label = box.querySelector(".ruler-label")
	if (!label) {
		label = document.createElement("div")
		label.className = "ruler-label"
		label.style.display = "flex"
		label.style.alignItems = "center"
		label.style.justifyContent = "center"
		label.style.position = "absolute"
		label.style.bottom = "2px"
		label.style.right = "5px"
		label.style.color = "#1677ff"
		label.style.fontSize = "12px"
		label.style.fontWeight = "bold"
		label.style.userSelect = "none"
		label.style.pointerEvents = "none"
		label.style.zIndex = "10"
		box.appendChild(label)
	}
	label.textContent = `${box.offsetWidth}px × ${box.offsetHeight}px`
}

// Tastatur-Steuerung für Verschieben mit Pfeiltasten oder WASD
function onKeyDown(e) {
	if (!selectedRuler) return

	let dx = 0,
		dy = 0
	const step = e.shiftKey ? 10 : 1

	switch (e.key) {
		case "ArrowUp":
		case "w":
		case "W":
			dy = -step
			break
		case "ArrowDown":
		case "s":
		case "S":
			dy = step
			break
		case "ArrowLeft":
		case "a":
		case "A":
			dx = -step
			break
		case "ArrowRight":
		case "d":
		case "D":
			dx = step
			break
		default:
			return
	}

	const newX = selectedRuler.offsetLeft + dx
	const newY = selectedRuler.offsetTop + dy

	selectedRuler.style.left = newX + "px"
	selectedRuler.style.top = newY + "px"
	updateSnapLines(selectedRuler)
	e.preventDefault()
}

let isInitialized = false

document.addEventListener("contextmenu", e => {
	// Nur beim ersten Rechtsklick das Overlay initialisieren
	if (!isInitialized) {
		init()
		isInitialized = true
	}
	// Optional: Hier kannst du das Overlay sichtbar machen,
	// falls du es versteckt hast und es nur bei Rechtsklick zeigen willst.
})

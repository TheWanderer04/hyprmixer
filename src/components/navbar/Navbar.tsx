import { PlayerContext } from "@/contexts/PlayerContext";
import { faGear, faSliders, faVolumeHigh } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useContext } from "react";

export default function Navbar() {
	const { currentPlayer, pageOpened, setPageOpened } = useContext(PlayerContext)

	const title = (() => {
		switch (pageOpened) {
			case 1: return "Players"
			case 2: return "Settings"
			case 3: return "Mixer"
			default: return currentPlayer.name.split(".")[0]
		}
	})()

	return <nav className="top-0 z-40 w-full fixed drop-shadow-lg border-b border-slate-400">
		<div className="px-4 flex items-center justify-between">
			<div className="flex items-center gap-1">
				<button onClick={() => {
					if (currentPlayer.name !== "No players found")
						setPageOpened(pageOpened !== 1 ? 1 : 0)
				}} className="hover:bg-gray-900/60 py-1 px-2 rounded-lg focus-visible:outline-white transition-all" title="Players">
					<FontAwesomeIcon icon={faSliders} />
				</button>
				<button onClick={() => {
					setPageOpened(pageOpened !== 3 ? 3 : 0)
				}} className="hover:bg-gray-900/60 py-1 px-2 rounded-lg focus-visible:outline-white transition-all" title="Mixer (outputs & per-app volume)">
					<FontAwesomeIcon icon={faVolumeHigh} />
				</button>
			</div>
			<span>{title}</span>
			<button onClick={() => {
				if (currentPlayer.name !== "No players found")
					setPageOpened(pageOpened !== 2 ? 2 : 0)
			}} className="hover:bg-gray-900/60 py-1 px-2 rounded-lg focus-visible:outline-white transition-all" title="Settings">
				<FontAwesomeIcon icon={faGear} />
			</button>
		</div>
	</nav>
}

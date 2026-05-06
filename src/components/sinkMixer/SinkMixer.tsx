import Sink from "@/model/Sink"
import SinkInput from "@/model/SinkInput"
import Source from "@/model/Source"
import Card from "@/model/Card"
import {
	listSinks,
	listSinkInputs,
	setSinkVolume,
	setSinkMute,
	setDefaultSink,
	setSinkInputVolume,
	setSinkInputMute,
	moveSinkInput,
	listSources,
	setSourceVolume,
	setSourceMute,
	setDefaultSource,
	listCards,
	setCardProfile,
} from "@/service/sinkService"
import {
	faVolumeHigh,
	faVolumeLow,
	faVolumeXmark,
	faStar,
	faMicrophone,
	faMicrophoneSlash,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useEffect, useState } from "react"

function volumeIcon(volume: number, muted: boolean) {
	if (muted || volume === 0) return faVolumeXmark
	if (volume * 100 >= 50) return faVolumeHigh
	return faVolumeLow
}

function VolumeSlider({
	value,
	muted,
	onChange,
}: {
	value: number
	muted: boolean
	onChange: (v: number) => void
}) {
	const pct = Math.round(value * 100)
	return (
		<div className="ms-4 h-1 bg-slate-700 relative w-full rounded-full group">
			<input
				type="range"
				min="0"
				max="150"
				value={pct}
				onChange={(e) => onChange(+e.target.value / 100)}
				className="z-50 absolute w-full h-1 rounded-lg appearance-none cursor-pointer range-sm bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full group-hover:[&::-webkit-slider-thumb]:h-3 group-hover:[&::-webkit-slider-thumb]:w-3 focus-visible:outline-none"
			/>
			<div
				className={`z-0 absolute h-1 rounded-full ${muted ? "bg-slate-500" : pct > 100 ? "bg-red-400" : "bg-white"}`}
				style={{ width: Math.min(pct, 150) / 1.5 + "%" }}
			></div>
			<div className="opacity-0 translate-x-1 whitespace-nowrap bg-[rgba(36,40,56,0.6)] text-white text-center text-xs rounded-lg py-1 absolute z-10 group-hover:translate-x-0 group-hover:opacity-100 -top-[1.05rem] -right-12 px-2 pointer-events-none transition-all">
				{pct}%
			</div>
		</div>
	)
}

function SinkRow({ sink, onUpdate }: { sink: Sink; onUpdate: () => void }) {
	const [volume, setVolume] = useState(sink.volume)
	const [muted, setMuted] = useState(sink.muted)

	useEffect(() => {
		setVolume(sink.volume)
		setMuted(sink.muted)
	}, [sink.id, sink.volume, sink.muted])

	function handleVolume(v: number) {
		setVolume(v)
		setSinkVolume(sink.id, v)
	}

	function handleMute() {
		const next = !muted
		setMuted(next)
		setSinkMute(sink.id, next)
	}

	function handleSetDefault() {
		setDefaultSink(sink.name)
		setTimeout(onUpdate, 150)
	}

	return (
		<li className="pl-6 pr-4 py-2 border-b border-b-slate-400 flex justify-start items-center w-full hover:bg-[rgba(36,40,59,0.4)]">
			<button
				onClick={handleSetDefault}
				title={sink.isDefault ? "Default output" : "Set as default"}
				className={`mr-3 w-6 h-6 flex items-center justify-center rounded ${
					sink.isDefault ? "text-yellow-300" : "text-slate-500 hover:text-slate-300"
				} transition-all`}
			>
				<FontAwesomeIcon className="text-xs" icon={faStar} />
			</button>
			<label className="text-sm sm:text-base min-w-32 sm:min-w-52 truncate" title={sink.description}>
				{sink.description}
			</label>
			<button
				onClick={handleMute}
				type="button"
				className="px-3 pb-1 ms-1 sm:ms-4 sm:px-4 sm:pb-1 border border-slate-600 bg-[rgba(36,40,59,0.4)] drop-shadow rounded hover:bg-[rgba(36,40,59,0.6)] hover:border-slate-400 transition-all"
			>
				<FontAwesomeIcon className="text-xs" icon={volumeIcon(volume, muted)} />
			</button>
			<VolumeSlider value={volume} muted={muted} onChange={handleVolume} />
		</li>
	)
}

function SinkInputRow({
	input,
	sinks,
	onUpdate,
}: {
	input: SinkInput
	sinks: Sink[]
	onUpdate: () => void
}) {
	const [volume, setVolume] = useState(input.volume)
	const [muted, setMuted] = useState(input.muted)

	useEffect(() => {
		setVolume(input.volume)
		setMuted(input.muted)
	}, [input.id, input.volume, input.muted])

	function handleVolume(v: number) {
		setVolume(v)
		setSinkInputVolume(input.id, v)
	}

	function handleMute() {
		const next = !muted
		setMuted(next)
		setSinkInputMute(input.id, next)
	}

	function handleMove(targetSinkId: number) {
		moveSinkInput(input.id, targetSinkId)
		setTimeout(onUpdate, 150)
	}

	return (
		<li className="pl-6 pr-4 py-2 border-b border-b-slate-400 flex justify-start items-center w-full hover:bg-[rgba(36,40,59,0.4)]">
			<label
				className="text-sm sm:text-base min-w-28 sm:min-w-40 truncate"
				title={`${input.appName}${input.binary ? ` (${input.binary})` : ""}`}
			>
				{input.appName}
			</label>
			<select
				value={input.sinkId}
				onChange={(e) => handleMove(+e.target.value)}
				className="ms-2 px-2 py-1 text-xs bg-[rgba(36,40,59,0.6)] border border-slate-600 rounded focus-visible:outline-white max-w-32 truncate"
				title="Output device"
			>
				{sinks.map((s) => (
					<option key={s.id} value={s.id}>
						{s.description.length > 20 ? s.description.slice(0, 20) + "…" : s.description}
					</option>
				))}
			</select>
			<button
				onClick={handleMute}
				type="button"
				className="px-3 pb-1 ms-1 sm:ms-4 sm:px-4 sm:pb-1 border border-slate-600 bg-[rgba(36,40,59,0.4)] drop-shadow rounded hover:bg-[rgba(36,40,59,0.6)] hover:border-slate-400 transition-all"
			>
				<FontAwesomeIcon className="text-xs" icon={volumeIcon(volume, muted)} />
			</button>
			<VolumeSlider value={volume} muted={muted} onChange={handleVolume} />
		</li>
	)
}

function SourceRow({ source, onUpdate }: { source: Source; onUpdate: () => void }) {
	const [volume, setVolume] = useState(source.volume)
	const [muted, setMuted] = useState(source.muted)

	useEffect(() => {
		setVolume(source.volume)
		setMuted(source.muted)
	}, [source.id, source.volume, source.muted])

	function handleVolume(v: number) {
		setVolume(v)
		setSourceVolume(source.id, v)
	}

	function handleMute() {
		const next = !muted
		setMuted(next)
		setSourceMute(source.id, next)
	}

	function handleSetDefault() {
		setDefaultSource(source.name)
		setTimeout(onUpdate, 150)
	}

	return (
		<li className="pl-6 pr-4 py-2 border-b border-b-slate-400 flex justify-start items-center w-full hover:bg-[rgba(36,40,59,0.4)]">
			<button
				onClick={handleSetDefault}
				title={source.isDefault ? "Default input" : "Set as default"}
				className={`mr-3 w-6 h-6 flex items-center justify-center rounded ${
					source.isDefault ? "text-yellow-300" : "text-slate-500 hover:text-slate-300"
				} transition-all`}
			>
				<FontAwesomeIcon className="text-xs" icon={faStar} />
			</button>
			<label className="text-sm sm:text-base min-w-32 sm:min-w-52 truncate" title={source.description}>
				{source.description}
			</label>
			<button
				onClick={handleMute}
				type="button"
				className="px-3 pb-1 ms-1 sm:ms-4 sm:px-4 sm:pb-1 border border-slate-600 bg-[rgba(36,40,59,0.4)] drop-shadow rounded hover:bg-[rgba(36,40,59,0.6)] hover:border-slate-400 transition-all"
				title={muted ? "Muted" : "Mute"}
			>
				<FontAwesomeIcon className="text-xs" icon={muted ? faMicrophoneSlash : faMicrophone} />
			</button>
			<VolumeSlider value={volume} muted={muted} onChange={handleVolume} />
		</li>
	)
}

function CardRow({ card, onUpdate }: { card: Card; onUpdate: () => void }) {
	const [active, setActive] = useState(card.activeProfile)

	useEffect(() => { setActive(card.activeProfile) }, [card.id, card.activeProfile])

	function handleChange(profileId: string) {
		setActive(profileId)
		setCardProfile(card.id, profileId)
		setTimeout(onUpdate, 200)
	}

	return (
		<li className="pl-6 pr-4 py-3 border-b border-b-slate-400 flex flex-col gap-2 hover:bg-[rgba(36,40,59,0.4)]">
			<div className="text-sm sm:text-base truncate" title={card.name}>{card.description}</div>
			<select
				value={active}
				onChange={(e) => handleChange(e.target.value)}
				className="px-2 py-1 text-xs sm:text-sm bg-[rgba(36,40,59,0.6)] border border-slate-600 rounded focus-visible:outline-white max-w-full"
				title="Active profile"
			>
				{card.profiles.map((p) => (
					<option key={p.id} value={p.id} disabled={!p.available}>
						{p.description}{!p.available ? " (unavailable)" : ""}
					</option>
				))}
			</select>
		</li>
	)
}

export default function SinkMixer() {
	const [sinks, setSinks] = useState<Sink[]>([])
	const [inputs, setInputs] = useState<SinkInput[]>([])
	const [sources, setSources] = useState<Source[]>([])
	const [cards, setCards] = useState<Card[]>([])
	const [tab, setTab] = useState<"outputs" | "apps" | "inputs" | "cards">("outputs")
	const [error, setError] = useState<string | null>(null)

	async function refresh() {
		try {
			const [s, i, src, c] = await Promise.all([listSinks(), listSinkInputs(), listSources(), listCards()])
			setSinks(s)
			setInputs(i)
			setSources(src)
			setCards(c)
			setError(null)
		} catch (e: any) {
			setError(e?.message || "Failed to read pactl. Is PipeWire/PulseAudio running?")
		}
	}

	useEffect(() => {
		refresh()
		const id = setInterval(refresh, 2000)
		return () => clearInterval(id)
	}, [])

	return (
		<div className="mt-16 h-screen w-full flex flex-col">
			<div className="flex border-b border-slate-400">
				<button
					onClick={() => setTab("outputs")}
					className={`flex-1 py-2 text-xs sm:text-sm transition-all ${
						tab === "outputs" ? "bg-[rgba(36,40,59,0.6)] border-b-2 border-white" : "hover:bg-[rgba(36,40,59,0.3)]"
					}`}
				>
					Outputs ({sinks.length})
				</button>
				<button
					onClick={() => setTab("inputs")}
					className={`flex-1 py-2 text-xs sm:text-sm transition-all ${
						tab === "inputs" ? "bg-[rgba(36,40,59,0.6)] border-b-2 border-white" : "hover:bg-[rgba(36,40,59,0.3)]"
					}`}
				>
					Inputs ({sources.length})
				</button>
				<button
					onClick={() => setTab("apps")}
					className={`flex-1 py-2 text-xs sm:text-sm transition-all ${
						tab === "apps" ? "bg-[rgba(36,40,59,0.6)] border-b-2 border-white" : "hover:bg-[rgba(36,40,59,0.3)]"
					}`}
				>
					Apps ({inputs.length})
				</button>
				<button
					onClick={() => setTab("cards")}
					className={`flex-1 py-2 text-xs sm:text-sm transition-all ${
						tab === "cards" ? "bg-[rgba(36,40,59,0.6)] border-b-2 border-white" : "hover:bg-[rgba(36,40,59,0.3)]"
					}`}
				>
					Cards ({cards.length})
				</button>
			</div>

			{error && (
				<div className="px-4 py-2 text-xs text-red-300 bg-red-900/30 border-b border-red-800">
					{error}
				</div>
			)}

			<ul className="overflow-y-auto flex-1">
				{tab === "outputs" &&
					sinks.map((s) => <SinkRow key={s.id} sink={s} onUpdate={refresh} />)}
				{tab === "inputs" && sources.length === 0 && (
					<li className="px-6 py-4 text-sm text-slate-400">No input devices found.</li>
				)}
				{tab === "inputs" &&
					sources.map((s) => <SourceRow key={s.id} source={s} onUpdate={refresh} />)}
				{tab === "apps" && inputs.length === 0 && (
					<li className="px-6 py-4 text-sm text-slate-400">No applications playing audio.</li>
				)}
				{tab === "apps" &&
					inputs.map((i) => (
						<SinkInputRow key={i.id} input={i} sinks={sinks} onUpdate={refresh} />
					))}
				{tab === "cards" && cards.length === 0 && (
					<li className="px-6 py-4 text-sm text-slate-400">No sound cards found.</li>
				)}
				{tab === "cards" &&
					cards.map((c) => <CardRow key={c.id} card={c} onUpdate={refresh} />)}
			</ul>
		</div>
	)
}

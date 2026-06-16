import { Search, X } from "lucide-react";
import { useState } from "react";
import { type Patient } from "../utils/types";
import { mockPatients } from "../utils/DummyData";

interface PatientSearchProps {
	selectedPatient: Patient | null;
	onPatientSelect: (patient: Patient) => void;
	onClearPatient: () => void;
}

export default function PatientSearch({ selectedPatient, onPatientSelect, onClearPatient }: PatientSearchProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [showResults, setShowResults] = useState(false);

	const filteredPatients = mockPatients.filter(
		(p) =>
			p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			p.hospitalId.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const handleSelect = (patient: Patient) => {
		onPatientSelect(patient);
		setSearchQuery("");
		setShowResults(false);
	};

	return (
		<div className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden group">
			<h2 className="text-lg font-bold text-brand-text mb-4 font-display">Patient</h2>

			{!selectedPatient ? (
				<div className="relative">
					<div className="relative">
						<Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => {
								setSearchQuery(e.target.value);
								setShowResults(true);
							}}
							onFocus={() => setShowResults(true)}
							placeholder="Search by name or hospital ID..."
							className="w-full bg-brand-card/60 text-brand-text pl-12 pr-4 py-3.5 rounded-xl border border-brand-border/60 outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300 placeholder-brand-text-muted/50 text-sm"
						/>
					</div>

					{/* Results Dropdown */}
					{showResults && searchQuery && (
						<div className="static top-full left-0 right-0 mt-2 bg-brand-bg/95 backdrop-blur-md rounded-xl border border-brand-border/60 overflow-hidden z-10 shadow-2xl animate-fade-in-up">
							{filteredPatients.length > 0 ? (
								filteredPatients.map((patient) => (
									<button
										key={patient.id}
										onClick={() => handleSelect(patient)}
										className="w-full text-left px-5 py-3.5 hover:bg-brand-card border-b border-brand-border/30 last:border-0 transition-all duration-200"
									>
										<p className="text-brand-text font-bold text-sm">{patient.name}</p>
										<p className="text-brand-text-muted/70 text-xs font-semibold mt-0.5">
											{patient.hospitalId} · {patient.age}y · {patient.sex}
										</p>
									</button>
								))
							) : (
								<div className="px-5 py-8 text-center">
									<p className="text-brand-text-muted/70 text-sm mb-3">Patient not found</p>
									<a
										href="/patients/new"
										className="text-brand-primary hover:text-brand-primary-hover hover:underline text-sm font-bold transition-colors"
									>
										+ Register new patient
									</a>
								</div>
							)}
						</div>
					)}
				</div>
			) : (
				<div className="flex items-center justify-between bg-brand-primary/5 border border-brand-primary/20 px-5 py-4 rounded-xl animate-fade-in-up">
					<div>
						<p className="text-brand-text font-bold text-sm">{selectedPatient.name}</p>
						<p className="text-brand-text-muted/70 text-xs font-semibold mt-0.5">
							{selectedPatient.hospitalId} · {selectedPatient.age}y · {selectedPatient.sex}
						</p>
					</div>
					<button 
						onClick={onClearPatient} 
						className="text-brand-text-muted/70 hover:text-rose-400 p-1.5 rounded-lg hover:bg-brand-card/60 transition-all duration-200"
					>
						<X size={16} />
					</button>
				</div>
			)}
		</div>
	);
}


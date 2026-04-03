import { Search, X } from "lucide-react";
import { useState } from "react";

interface Patient {
	id: string;
	name: string;
	hospitalId: string;
	age: number;
	sex: string;
}

interface PatientSearchProps {
	selectedPatient: Patient | null;
	onPatientSelect: (patient: Patient) => void;
	onClearPatient: () => void;
}

export default function PatientSearch({ selectedPatient, onPatientSelect, onClearPatient }: PatientSearchProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [showResults, setShowResults] = useState(false);

	// Mock search results
	const mockPatients: Patient[] = [
		{ id: "1", name: "Sarah Connor", hospitalId: "RAD-4042-M", age: 45, sex: "Female" },
		{ id: "2", name: "Arthur Morgan", hospitalId: "RAD-1899-K", age: 52, sex: "Male" },
	];

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
		<div className="bg-[#151b2d] rounded-xl p-6">
			<h2 className="text-lg font-bold text-[#dce1fb] mb-4">Patient</h2>

			{!selectedPatient ? (
				<div className="relative">
					<div className="relative">
						<Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#dce1fb]/50" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => {
								setSearchQuery(e.target.value);
								setShowResults(true);
							}}
							onFocus={() => setShowResults(true)}
							placeholder="Search by name or hospital ID..."
							className="w-full bg-[#191f31] text-[#dce1fb] pl-12 pr-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
						/>
					</div>

					{/* Results Dropdown */}
					{showResults && searchQuery && (
						<div className="absolute top-full left-0 right-0 mt-2 bg-[#191f31] rounded-lg border border-[#2e3447] overflow-hidden z-10">
							{filteredPatients.length > 0 ? (
								filteredPatients.map((patient) => (
									<button
										key={patient.id}
										onClick={() => handleSelect(patient)}
										className="w-full text-left px-4 py-3 hover:bg-[#2e3447] transition-colors"
									>
										<p className="text-[#dce1fb] font-semibold">{patient.name}</p>
										<p className="text-[#dce1fb]/70 text-sm">
											{patient.hospitalId} · {patient.age}y · {patient.sex}
										</p>
									</button>
								))
							) : (
								<div className="px-4 py-6 text-center">
									<p className="text-[#dce1fb]/70 mb-3">Patient not found</p>
									<a
										href="/patients/new"
										className="text-[#7bd0ff] hover:underline text-sm font-semibold"
									>
										+ Register new patient
									</a>
								</div>
							)}
						</div>
					)}
				</div>
			) : (
				<div className="flex items-center justify-between bg-[#191f31] px-4 py-3 rounded-lg">
					<div>
						<p className="text-[#dce1fb] font-semibold">{selectedPatient.name}</p>
						<p className="text-[#dce1fb]/70 text-sm">
							{selectedPatient.hospitalId} · {selectedPatient.age}y · {selectedPatient.sex}
						</p>
					</div>
					<button onClick={onClearPatient} className="text-[#dce1fb]/70 hover:text-[#ffb4ab] transition-colors">
						<X size={20} />
					</button>
				</div>
			)}
		</div>
	);
}

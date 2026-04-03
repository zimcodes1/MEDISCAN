import { Upload, FileImage } from "lucide-react";
import { useState } from "react";

interface ScanDetailsFormProps {
	scanType: string;
	imageFile: File | null;
	viewProjection: string;
	scanDate: string;
	clinicalNotes: string;
	onScanTypeChange: (value: string) => void;
	onImageFileChange: (file: File | null) => void;
	onViewProjectionChange: (value: string) => void;
	onScanDateChange: (value: string) => void;
	onClinicalNotesChange: (value: string) => void;
}

export default function ScanDetailsForm({
	scanType,
	imageFile,
	viewProjection,
	scanDate,
	clinicalNotes,
	onScanTypeChange,
	onImageFileChange,
	onViewProjectionChange,
	onScanDateChange,
	onClinicalNotesChange,
}: ScanDetailsFormProps) {
	const [isDragging, setIsDragging] = useState(false);

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = () => {
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			onImageFileChange(e.dataTransfer.files[0]);
		}
	};

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			onImageFileChange(e.target.files[0]);
		}
	};

	return (
		<div className="bg-[#151b2d] rounded-xl p-6 space-y-6">
			<h2 className="text-lg font-bold text-[#dce1fb]">Scan Details</h2>

			{/* Scan Type */}
			<div>
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
					Scan Type
				</label>
				<select
					value={scanType}
					onChange={(e) => onScanTypeChange(e.target.value)}
					className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
				>
					<option value="chest-xray">Chest X-Ray</option>
					<option value="ct-scan" disabled className="text-[#dce1fb]/30">
						CT Scan (Coming Soon)
					</option>
					<option value="mri" disabled className="text-[#dce1fb]/30">
						MRI (Coming Soon)
					</option>
				</select>
			</div>

			{/* Image File Upload */}
			<div>
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
					Image File
				</label>
				{!imageFile ? (
					<div
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
							isDragging ? "border-[#7bd0ff] bg-[#191f31]" : "border-[#2e3447] bg-transparent"
						}`}
					>
						<div className="flex flex-col items-center gap-3">
							<Upload size={32} className="text-[#7bd0ff]" />
							<div>
								<p className="text-[#dce1fb] mb-1">Drag & drop or browse</p>
								<p className="text-[#dce1fb]/50 text-xs">JPEG, PNG, DICOM (.dcm)</p>
							</div>
							<label className="inline-block">
								<input
									type="file"
									accept=".jpg,.jpeg,.png,.dcm,.dicom"
									onChange={handleFileInput}
									className="hidden"
								/>
								<span className="bg-[#2e3447] text-[#7bd0ff] px-4 py-2 rounded-lg cursor-pointer hover:bg-[#191f31] transition-colors inline-block text-sm">
									Browse Files
								</span>
							</label>
						</div>
					</div>
				) : (
					<div className="flex items-center justify-between bg-[#191f31] px-4 py-3 rounded-lg">
						<div className="flex items-center gap-3">
							<FileImage size={20} className="text-[#7bd0ff]" />
							<div>
								<p className="text-[#dce1fb] font-semibold">{imageFile.name}</p>
								<p className="text-[#dce1fb]/50 text-xs">
									{(imageFile.size / 1024 / 1024).toFixed(2)} MB
								</p>
							</div>
						</div>
						<button
							onClick={() => onImageFileChange(null)}
							className="text-[#dce1fb]/70 hover:text-[#ffb4ab] transition-colors text-sm"
						>
							Remove
						</button>
					</div>
				)}
			</div>

			{/* View/Projection */}
			<div>
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
					View / Projection
				</label>
				<select
					value={viewProjection}
					onChange={(e) => onViewProjectionChange(e.target.value)}
					className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
				>
					<option value="">Select view...</option>
					<option value="PA">PA (Posteroanterior)</option>
					<option value="AP">AP (Anteroposterior)</option>
					<option value="Lateral">Lateral</option>
				</select>
			</div>

			{/* Date of Scan */}
			<div>
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
					Date of Scan
				</label>
				<input
					type="date"
					value={scanDate}
					onChange={(e) => onScanDateChange(e.target.value)}
					className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
				/>
			</div>

			{/* Clinical Notes */}
			<div>
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
					Pre-Analysis Notes (Optional)
				</label>
				<textarea
					value={clinicalNotes}
					onChange={(e) => onClinicalNotesChange(e.target.value)}
					placeholder="Reason for scan / clinical suspicion..."
					rows={4}
					className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all resize-none"
				/>
			</div>
		</div>
	);
}

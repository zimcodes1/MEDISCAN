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
		<div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-6 relative overflow-hidden group">
			<h2 className="text-lg font-bold text-brand-text font-display">Scan Details</h2>

			{/* Scan Type */}
			<div>
				<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2">
					Scan Type
				</label>
				<select
					value={scanType}
					onChange={(e) => onScanTypeChange(e.target.value)}
					className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border/60 outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
				>
					<option value="chest-xray">Chest X-Ray</option>
					<option value="ct-scan" disabled className="text-brand-text-muted/30">
						CT Scan (Coming Soon)
					</option>
					<option value="mri" disabled className="text-brand-text-muted/30">
						MRI (Coming Soon)
					</option>
				</select>
			</div>

			{/* Image File Upload */}
			<div>
				<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2">
					Image File
				</label>
				{!imageFile ? (
					<div
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${
							isDragging 
								? "border-brand-primary bg-brand-primary/10 shadow-[0_0_20px_rgba(0,210,255,0.1)] scale-[1.01]" 
								: "border-brand-border/80 bg-transparent hover:border-brand-primary/50 hover:bg-brand-primary/5"
						}`}
					>
						<div className="flex flex-col items-center gap-3">
							<Upload size={32} className="text-brand-primary animate-pulse" />
							<div>
								<p className="text-brand-text font-bold mb-1 text-sm">Drag & drop or browse</p>
								<p className="text-brand-text-muted/50 text-xs">JPEG, PNG, DICOM (.dcm)</p>
							</div>
							<label className="inline-block">
								<input
									type="file"
									accept=".jpg,.jpeg,.png,.dcm,.dicom"
									onChange={handleFileInput}
									className="hidden"
								/>
								<span className="bg-brand-card text-brand-primary border border-brand-border/60 px-4 py-2 rounded-xl cursor-pointer hover:bg-brand-primary hover:text-brand-bg hover:border-brand-primary transition-all duration-300 inline-block text-xs font-bold mt-2 shadow-sm">
									Browse Files
								</span>
							</label>
						</div>
					</div>
				) : (
					<div className="flex items-center justify-between bg-brand-primary/5 border border-brand-primary/20 px-5 py-4 rounded-xl animate-fade-in-up">
						<div className="flex items-center gap-3">
							<FileImage size={20} className="text-brand-primary" />
							<div>
								<p className="text-brand-text font-bold text-sm">{imageFile.name}</p>
								<p className="text-brand-text-muted/50 text-xs font-semibold mt-0.5">
									{(imageFile.size / 1024 / 1024).toFixed(2)} MB
								</p>
							</div>
						</div>
						<button
							onClick={() => onImageFileChange(null)}
							className="text-brand-text-muted/70 hover:text-rose-400 p-1.5 rounded-lg hover:bg-brand-card/60 transition-all duration-200 text-xs font-bold"
						>
							Remove
						</button>
					</div>
				)}
			</div>

			{/* View/Projection */}
			<div>
				<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2">
					View / Projection
				</label>
				<select
					value={viewProjection}
					onChange={(e) => onViewProjectionChange(e.target.value)}
					className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border/60 outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
				>
					<option value="">Select view...</option>
					<option value="PA">PA (Posteroanterior)</option>
					<option value="AP">AP (Anteroposterior)</option>
					<option value="Lateral">Lateral</option>
				</select>
			</div>

			{/* Date of Scan */}
			<div>
				<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2">
					Date of Scan
				</label>
				<input
					type="date"
					value={scanDate}
					onChange={(e) => onScanDateChange(e.target.value)}
					className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border/60 outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
				/>
			</div>

			{/* Clinical Notes */}
			<div>
				<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2">
					Pre-Analysis Notes (Optional)
				</label>
				<textarea
					value={clinicalNotes}
					onChange={(e) => onClinicalNotesChange(e.target.value)}
					placeholder="Reason for scan / clinical suspicion..."
					rows={4}
					className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border/60 outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300 resize-none placeholder-brand-text-muted/40"
				/>
			</div>
		</div>
	);
}


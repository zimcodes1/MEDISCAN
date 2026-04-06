import { FileCheck, Save } from "lucide-react";

interface SubmissionFooterProps {
  radiologistName: string;
  radiologistCredentials: string;
  confirmationChecked: boolean;
  onConfirmationChange: (checked: boolean) => void;
  onSaveDraft: () => void;
  onSubmitReport: () => void;
  isSubmitted?: boolean;
  submittedDate?: string;
  disabled?: boolean;
}

export default function SubmissionFooter({
  radiologistName,
  radiologistCredentials,
  confirmationChecked,
  onConfirmationChange,
  onSaveDraft,
  onSubmitReport,
  isSubmitted = false,
  submittedDate,
  disabled = false,
}: SubmissionFooterProps) {
  return (
    <div className="bg-[#151b2d] rounded-xl p-6">
      {/* Radiologist Info */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-1">
              Reporting Radiologist
            </p>
            <p className="text-[#dce1fb] font-semibold text-lg">
              {radiologistName}, {radiologistCredentials}
            </p>
          </div>
          {isSubmitted && submittedDate && (
            <div className="text-right">
              <p className="text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-1">
                Report Submitted
              </p>
              <p className="text-[#dce1fb] font-semibold">{submittedDate}</p>
            </div>
          )}
        </div>
      </div>

      {!isSubmitted ? (
        <>
          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 p-4 bg-[#191f31] rounded-lg mb-6 cursor-pointer hover:bg-[#2e3447] transition-colors">
            <input
              type="checkbox"
              checked={confirmationChecked}
              onChange={(e) => onConfirmationChange(e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 mt-0.5 rounded border-[#2e3447] bg-[#0c1324] text-[#7bd0ff] focus:ring-[#7bd0ff] focus:ring-offset-0"
            />
            <span className="text-[#dce1fb] text-sm">
              I confirm this report reflects my independent clinical assessment
              and is subject to review.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onSaveDraft}
              disabled={disabled}
              className="flex-1 flex items-center justify-center gap-2 bg-[#2e3447] text-[#7bd0ff] py-4 rounded-lg font-semibold hover:bg-[#191f31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              Save Draft
            </button>
            <button
              onClick={onSubmitReport}
              disabled={!confirmationChecked || disabled}
              className="flex-1 flex items-center justify-center gap-2 bg-[#7bd0ff] text-[#0c1324] py-4 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileCheck size={20} />
              <span className="sm:hidden">Submit</span>
              <span className="hidden sm:inline">Submit & Sign Report</span>
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center gap-3 p-4 bg-[#4ade80]/10 rounded-lg border-2 border-[#4ade80]">
          <FileCheck size={24} className="text-[#4ade80]" />
          <p className="text-[#4ade80] font-semibold">
            Report Submitted & Signed
          </p>
        </div>
      )}
    </div>
  );
}

import { InputField, SectionCard } from './settingsComp';

interface ContactInformationProps {
  supportEmail: string;
  setSupportEmail: (value: string) => void;
  supportPhone: string;
  setSupportPhone: (value: string) => void;
}

export const ContactInformation = ({
  supportEmail,
  setSupportEmail,
  supportPhone,
  setSupportPhone,
}: ContactInformationProps) => (
  <SectionCard title="Contact Information">
    <div className="space-y-4">
      <InputField
        label="Support Contact Email*"
        type="email"
        value={supportEmail}
        onChange={(e) => setSupportEmail(e.target.value)}
      />

      <InputField
        label="Support Phone Number*"
        type="tel"
        value={supportPhone}
        onChange={(e) => setSupportPhone(e.target.value)}
      />
    </div>
  </SectionCard>
);
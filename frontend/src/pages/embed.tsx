import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export default function Embed() {
  const embedCode = `<iframe src="https://yourdomain.com/embed/tenant-id" width="100%" height="600" frameborder="0"></iframe>`;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold mb-4">Embed Your Bot</h1>
      <p className="mb-2 text-gray-600">
        Copy and paste the following code into your website:
      </p>

      <Textarea
        readOnly
        value={embedCode}
        className="min-h-[120px] font-mono"
      />

      <Button
        className="mt-4"
        onClick={() => {
          navigator.clipboard.writeText(embedCode)
        }}
      >
        📋 Copy to Clipboard
      </Button>
    </div>
  );
}

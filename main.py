from fpdf import FPDF
import os

class PDF(FPDF):
    def header(self):
        self.set_font("Arial", "B", 12)
        self.set_text_color(128, 0, 128)  # Purple
        self.cell(0, 10, "📝 Made by Kashif Sayyad", ln=True, align="C")
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("Arial", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

# Create PDF object
pdf = PDF()
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=15)
pdf.set_font("Arial", size=12)

# Load sample text
with open("sample.txt", "r", encoding="utf-8") as file:
    content = file.read()
    pdf.multi_cell(0, 10, content)

# Ensure output folder exists
if not os.path.exists("output"):
    os.makedirs("output")

# Save PDF
pdf.output("output/generated_by_kashif.pdf")

print("✅ PDF created successfully in /output folder.")

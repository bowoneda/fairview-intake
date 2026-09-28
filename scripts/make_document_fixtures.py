"""Generate the synthetic documents used to test the Textract pipeline (PHASE-2-SPEC.md, TEXTRACT PIPELINE).

Every value is fictional: a made up employer and person in the fictional City of Fairview, State of Meridian,
and 000-00-0000 wherever an SSN box exists. No real document is ever committed. expected.json holds the true
values, so tests and the vetting sub-agent can compare Textract's answers against a known answer key.

Run from the repository root:  python scripts/make_document_fixtures.py
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path("tests/fixtures/documents")
FONT_DIR = Path("C:/Windows/Fonts")
W, H = 1700, 2200  # US letter at 200 dpi


def font(size, bold=False):
    return ImageFont.truetype(str(FONT_DIR / ("arialbd.ttf" if bold else "arial.ttf")), size)


def page():
    img = Image.new("RGB", (W, H), "white")
    return img, ImageDraw.Draw(img)


def boxed(d, x, y, w, h, label, value, label_size=24, value_size=34):
    d.rectangle([x, y, x + w, y + h], outline="black", width=2)
    d.text((x + 12, y + 8), label, fill="black", font=font(label_size))
    d.text((x + 12, y + h - value_size - 14), value, fill="black", font=font(value_size, bold=True))


def paystub():
    img, d = page()
    d.text((100, 90), "Fairview Parcel Services LLC", fill="black", font=font(52, True))
    d.text((100, 160), "210 Harbor Street, Fairview, Meridian 00420", fill="black", font=font(30))
    d.text((1150, 100), "EARNINGS STATEMENT", fill="black", font=font(40, True))
    boxed(d, 100, 260, 740, 120, "Employee Name", "Jordan Q. Sample")
    boxed(d, 860, 260, 740, 120, "Employee SSN", "***-**-0000")
    boxed(d, 100, 400, 480, 120, "Pay Period Start", "08/24/2026")
    boxed(d, 600, 400, 480, 120, "Pay Period End", "09/06/2026")
    boxed(d, 1100, 400, 500, 120, "Pay Date", "09/11/2026")
    boxed(d, 100, 540, 740, 120, "Pay Frequency", "Bi-Weekly")
    boxed(d, 860, 540, 740, 120, "Hourly Rate", "$18.50")

    y = 720
    d.text((100, y), "EARNINGS", fill="black", font=font(34, True))
    cols = [(100, "Description"), (700, "Hours"), (1000, "This Period"), (1330, "Year to Date")]
    y += 60
    for x, t in cols:
        d.text((x, y), t, fill="black", font=font(28, True))
    y += 50
    for x, t in zip([c[0] for c in cols], ["Regular Pay", "80.00", "$1,480.00", "$26,640.00"]):
        d.text((x, y), t, fill="black", font=font(30))
    y += 60
    for x, t in zip([c[0] for c in cols], ["Gross Pay", "80.00", "$1,480.00", "$26,640.00"]):
        d.text((x, y), t, fill="black", font=font(30, True))

    y += 110
    d.text((100, y), "DEDUCTIONS", fill="black", font=font(34, True))
    y += 60
    for x, t in [(100, "Description"), (1000, "This Period")]:
        d.text((x, y), t, fill="black", font=font(28, True))
    for label, amt in [("Federal Income Tax", "$118.40"), ("Social Security", "$91.76"),
                       ("Medicare", "$21.46"), ("Meridian State Tax", "$44.40")]:
        y += 55
        d.text((100, y), label, fill="black", font=font(30))
        d.text((1000, y), amt, fill="black", font=font(30))
    y += 55
    d.text((100, y), "Total Deductions", fill="black", font=font(30, True))
    d.text((1000, y), "$276.02", fill="black", font=font(30, True))

    boxed(d, 100, y + 110, 740, 130, "Net Pay", "$1,203.98", value_size=40)
    d.text((100, H - 140), "This is a synthetic test document. Not a real pay statement.", fill="black", font=font(26))
    return img


def w2():
    img, d = page()
    d.text((100, 90), "Form W-2  Wage and Tax Statement   2025", fill="black", font=font(48, True))
    boxed(d, 100, 200, 740, 120, "a  Employee's social security number", "000-00-0000")
    boxed(d, 100, 340, 740, 120, "b  Employer identification number (EIN)", "00-0000000")
    boxed(d, 100, 480, 740, 200, "c  Employer's name, address, and ZIP code",
          "Fairview Parcel Services LLC", value_size=32)
    boxed(d, 100, 700, 740, 120, "e  Employee's name", "Jordan Q. Sample")
    boxed(d, 860, 200, 370, 150, "1  Wages, tips, other compensation", "34120.50", label_size=20)
    boxed(d, 1240, 200, 370, 150, "2  Federal income tax withheld", "2730.00", label_size=20)
    boxed(d, 860, 370, 370, 150, "3  Social security wages", "35200.00", label_size=20)
    boxed(d, 1240, 370, 370, 150, "4  Social security tax withheld", "2182.40", label_size=20)
    boxed(d, 860, 540, 370, 150, "5  Medicare wages and tips", "35200.00", label_size=20)
    boxed(d, 1240, 540, 370, 150, "6  Medicare tax withheld", "510.40", label_size=20)
    boxed(d, 860, 710, 750, 110, "Tax year", "2025", label_size=20)
    d.text((100, H - 140), "This is a synthetic test document. Not a real tax form.", fill="black", font=font(26))
    return img


def schedule_c():
    img, d = page()
    d.text((100, 80), "SCHEDULE C (Form 1040)   Profit or Loss From Business   2025", fill="black", font=font(40, True))
    d.text((100, 140), "(Sole Proprietorship)   Page 1", fill="black", font=font(30))
    boxed(d, 100, 200, 1500, 110, "Name of proprietor", "Jordan Q. Sample")
    boxed(d, 100, 330, 1000, 110, "C  Business name", "Sample Lawn Care")
    boxed(d, 1120, 330, 480, 110, "Social security number", "000-00-0000")
    lines = [
        ("1", "Gross receipts or sales", "24800.00"),
        ("2", "Returns and allowances", "0.00"),
        ("7", "Gross income", "24800.00"),
        ("9", "Car and truck expenses", "3100.00"),
        ("22", "Supplies", "2450.00"),
        ("27a", "Other expenses", "1800.00"),
        ("28", "Total expenses before expenses for business use of home", "7350.00"),
        ("29", "Tentative profit or (loss)", "17450.00"),
        ("30", "Expenses for business use of your home", "0.00"),
        ("31", "Net profit or (loss)", "17450.00"),
    ]
    y = 500
    d.text((100, y), "Part I  Income     Part II  Expenses", fill="black", font=font(32, True))
    for num, label, amt in lines:
        y += 120
        d.rectangle([100, y, 1600, y + 100], outline="black", width=2)
        d.text((120, y + 30), f"Line {num}", fill="black", font=font(30, True))
        d.text((320, y + 30), label, fill="black", font=font(28))
        d.text((1360, y + 30), amt, fill="black", font=font(32, True))
    d.text((100, H - 140), "This is a synthetic test document. Not a real tax form.", fill="black", font=font(26))
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    stub, form_w2, sched = paystub(), w2(), schedule_c()
    stub.save(OUT / "paystub.png")
    form_w2.save(OUT / "w2.png")
    sched.save(OUT / "schedule-c-page1.png")
    # Two pages: must be rejected before any AWS call (synchronous Textract accepts one PDF page).
    stub.save(OUT / "two-page.pdf", save_all=True, append_images=[form_w2])
    expected = {
        "paystub": {
            "employer_name": "Fairview Parcel Services LLC", "pay_period_start": "2026-08-24",
            "pay_period_end": "2026-09-06", "pay_date": "2026-09-11", "pay_frequency": "biweekly",
            "pay_rate": 18.50, "gross_pay": 1480.00, "ytd_gross": 26640.00, "net_pay": 1203.98,
        },
        "w2": {"employer_name": "Fairview Parcel Services LLC", "tax_year": 2025,
               "box1_wages": 34120.50, "box5_medicare_wages": 35200.00},
        "schedule_c": {"business_name": "Sample Lawn Care", "tax_year": 2025, "line1_gross_receipts": 24800.00,
                       "line28_total_expenses": 7350.00, "line31_net_profit": 17450.00},
        "two-page.pdf": {"pages": 2, "expected": "rejected before any AWS call"},
    }
    (OUT / "expected.json").write_text(json.dumps(expected, indent=2) + "\n", encoding="utf-8")
    for p in sorted(OUT.iterdir()):
        print(f"{p.name}: {p.stat().st_size} bytes")


if __name__ == "__main__":
    main()

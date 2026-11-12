import tempfile
import os
import urllib.parse
from openpyxl import Workbook
from openpyxl.styles import Font, Border, Side
from starlette.background import BackgroundTask
from fastapi.responses import FileResponse


def generate_excel_response(tracks, parcel_name):
    grouped = {}
    for t in tracks:
        key = (t["attachment"] or "Без названия", t["unit"] or "шт")
        if key not in grouped:
            grouped[key] = {"attachment": key[0],
                            "unit": key[1], "quantity": 0, "price": 0.0}
        grouped[key]["quantity"] += (t["quantity"] or 0)
        grouped[key]["price"] += (t["price"] or 0.0)

    final_items = list(grouped.values())
    wb = Workbook()
    ws = wb.active
    ws.title = "Опись"
    font_main = Font(name="Calibri", size=10)
    border_thin = Border(left=Side(style='thin'), right=Side(
        style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))

    ws['A1'] = "Опись груза:"
    ws['A1'].font = font_main
    ws.merge_cells('A1:E1')

    headers = ["№", "Наименование товара", "Кол-во единиц",
               "Единица измерения", "Общая стоимость в бел. рублях"]
    for col, text in enumerate(headers, start=1):
        ws.cell(row=2, column=col, value=text).font = font_main
        ws.cell(row=2, column=col).border = border_thin

    for i, item in enumerate(final_items, start=3):
        ws.cell(row=i, column=1, value=i-2).font = font_main
        ws.cell(row=i, column=2, value=item["attachment"]).font = font_main
        ws.cell(row=i, column=3, value=item["quantity"]).font = font_main
        ws.cell(row=i, column=4, value=item["unit"]).font = font_main
        price_cell = ws.cell(row=i, column=5, value=item["price"])
        price_cell.font = font_main
        price_cell.number_format = '#,##0.00'
        for c in range(1, 6):
            ws.cell(row=i, column=c).border = border_thin

    last_row = len(final_items) + 3
    ws.cell(row=last_row, column=2, value="Итоговая стоимость:").font = font_main
    total_cell = ws.cell(row=last_row, column=5,
                         value=f"=SUM(E3:E{last_row-1})" if final_items else "=0")
    total_cell.font = font_main
    total_cell.number_format = '#,##0.00'
    for c in range(1, 6):
        ws.cell(row=last_row, column=c).border = border_thin

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
    wb.save(tmp.name)
    tmp.close()

    safe_name = urllib.parse.quote(f"Опись_{parcel_name}.xlsx")
    return FileResponse(
        path=tmp.name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{safe_name}"},
        background=BackgroundTask(lambda: os.remove(tmp.name))
    )

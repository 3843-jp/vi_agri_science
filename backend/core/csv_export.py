import csv
from django.http import HttpResponse


def csv_response(filename: str, header: list[str], rows) -> HttpResponse:
    """
    Streams a CSV response. `rows` is any iterable of iterables matching
    `header`'s column order. Callers are responsible for passing an
    UNPAGINATED queryset/list — exports must reflect every record matching
    the current filters, not just the page currently on screen.
    """
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    writer = csv.writer(response)
    writer.writerow(header)
    for row in rows:
        writer.writerow(row)
    return response

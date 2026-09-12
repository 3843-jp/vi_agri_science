from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsPagination(PageNumberPagination):
    """
    Backend-enforced pagination. The frontend must never be able to request
    the entire table — this caps page size and always requires paging,
    which keeps the app fast regardless of how many years of data accumulate.
    """
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            "count": self.page.paginator.count,
            "total_pages": self.page.paginator.num_pages,
            "current_page": self.page.number,
            "page_size": self.get_page_size(self.request),
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
            "results": data,
        })

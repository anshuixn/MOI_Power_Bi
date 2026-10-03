class ReviewBandError(Exception):
    """Base class for expected application errors."""


class ResourceNotFoundError(ReviewBandError):
    def __init__(self, resource: str, resource_id: str) -> None:
        self.resource = resource
        self.resource_id = resource_id
        super().__init__(f"{resource} {resource_id} not found")


class InvalidRequestError(ReviewBandError):
    pass

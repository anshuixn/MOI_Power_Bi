import pytest
from fastapi import HTTPException

from app.api.dependencies import require_model_health_admin


@pytest.mark.parametrize("role", ["owner", "admin"])
def test_model_health_allows_organization_administrators(role: str) -> None:
    require_model_health_admin(role)


@pytest.mark.parametrize("role", ["analyst", "viewer"])
def test_model_health_rejects_non_administrators(role: str) -> None:
    with pytest.raises(HTTPException) as error:
        require_model_health_admin(role)

    assert error.value.status_code == 403

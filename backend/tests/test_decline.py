"""Checks the Arps fitting maths on made-up data where the right answer is known."""
import numpy as np
import pytest

from api.decline import Model, arps, band, fit, remaining_to_limit

T = np.arange(36)


def noisy(q, seed=0, pct=0.03):
    rng = np.random.default_rng(seed)
    return q * np.exp(rng.normal(0, pct, len(q)))


def test_arps_forms_meet_at_t0():
    for b in (0, 0.5, 1):
        assert arps(0, 1000, 0.05, b) == pytest.approx(1000)


def test_harmonic_declines_slower_than_exponential():
    assert arps(24, 1000, 0.05, 1) > arps(24, 1000, 0.05, 0.5) > arps(24, 1000, 0.05, 0)


def test_recovers_exponential():
    f = fit(T, arps(T, 2000, 0.04, 0), Model.exponential)
    assert f.qi == pytest.approx(2000, rel=1e-4)
    assert f.di == pytest.approx(0.04, rel=1e-4)
    assert f.r2 == pytest.approx(1.0)


def test_recovers_hyperbolic_b():
    f = fit(T, arps(T, 3000, 0.08, 0.6), Model.hyperbolic)
    assert f.b == pytest.approx(0.6, abs=0.02)
    assert f.di == pytest.approx(0.08, rel=0.02)


def test_fit_with_noise_is_close():
    f = fit(T, noisy(arps(T, 3000, 0.06, 0.5)), Model.hyperbolic)
    assert f.qi == pytest.approx(3000, rel=0.05)
    assert f.r2 > 0.95


def test_zero_months_are_ignored():
    q = arps(T, 2000, 0.04, 0)
    q[[5, 17]] = 0  # shutdown months
    f = fit(T, q, Model.exponential)
    assert f.n == len(T) - 2
    assert f.di == pytest.approx(0.04, rel=1e-3)


def test_too_few_months():
    with pytest.raises(ValueError):
        fit(T[:5], arps(T[:5], 1000, 0.05, 0), Model.exponential)


def test_band_widens_with_time():
    f = fit(T, noisy(arps(T, 3000, 0.06, 0.5)), Model.hyperbolic)
    t = np.arange(36, 76)
    lo, hi = band(f, t, 35)
    width = hi / lo
    assert np.all(np.diff(width) >= 0)
    assert np.all(lo < f.rate(t)) and np.all(f.rate(t) < hi)


def test_remaining_to_limit_exponential_matches_formula():
    qi, di, limit = 2000.0, 0.05, 200.0
    f = fit(T, arps(T, qi, di, 0), Model.exponential)
    mmbbl, months = remaining_to_limit(f, 35, limit)
    # months until q < limit, counted from t = 36 onwards
    expected_months = int(np.ceil(np.log(qi / limit) / di)) - 36
    assert months == pytest.approx(expected_months, abs=1)
    assert mmbbl > 0


def test_limit_never_reached():
    f = fit(T, arps(T, 2000, 0.01, 1), Model.harmonic)
    _, months = remaining_to_limit(f, 35, 1.0)
    assert months is None
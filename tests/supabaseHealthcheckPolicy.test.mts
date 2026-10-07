import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const healthcheckSql = fs.readFileSync('supabase/supabase-healthcheck.sql', 'utf8')
const securityValidationSql = fs.readFileSync('supabase/security-validation.sql', 'utf8')
const healthRoute = fs.readFileSync('src/app/api/health/route.ts', 'utf8')

test('el healthcheck inventaria la anulacion atomica de movimientos', () => {
  const occurrences = healthcheckSql.match(/'anular_movimiento_stock_atomico'/g) ?? []

  assert.ok(occurrences.length >= 3)
  assert.match(healthcheckSql, /stock_cancel_safe/)
  assert.match(securityValidationSql, /'anular_movimiento_stock_atomico'/)
})

test('los diagnosticos usan la firma actual de guardar receta', () => {
  assert.match(
    healthcheckSql,
    /p_nombre_tpv text, p_tipo_carta text, p_raciones numeric/
  )
  assert.match(healthRoute, /p_tipo_carta: 'comida'/)
})

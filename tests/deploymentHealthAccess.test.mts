import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canViewDeploymentHealth,
  extractBearerTokenFromHeader,
  normalizeDeploymentHealthRole,
} from '../src/lib/deploymentHealthAccess.ts'

test('normalizeDeploymentHealthRole normaliza roles conocidos', () => {
  assert.equal(normalizeDeploymentHealthRole(' MASTER '), 'master')
  assert.equal(normalizeDeploymentHealthRole('admin'), 'administrador')
  assert.equal(normalizeDeploymentHealthRole('administrador'), 'administrador')
  assert.equal(normalizeDeploymentHealthRole('encargado'), 'encargado')
})

test('normalizeDeploymentHealthRole cae a empleado para valores no privilegiados', () => {
  assert.equal(normalizeDeploymentHealthRole(''), 'empleado')
  assert.equal(normalizeDeploymentHealthRole('cliente'), 'empleado')
  assert.equal(normalizeDeploymentHealthRole(null), 'empleado')
})

test('canViewDeploymentHealth solo permite administrador y master', () => {
  assert.equal(canViewDeploymentHealth('master'), true)
  assert.equal(canViewDeploymentHealth('administrador'), true)
  assert.equal(canViewDeploymentHealth('encargado'), false)
  assert.equal(canViewDeploymentHealth('empleado'), false)
})

test('extractBearerTokenFromHeader extrae tokens bearer sin aceptar otros esquemas', () => {
  assert.equal(extractBearerTokenFromHeader('Bearer token-123'), 'token-123')
  assert.equal(extractBearerTokenFromHeader('  bearer   token-123  '), 'token-123')
  assert.equal(extractBearerTokenFromHeader('Basic token-123'), '')
  assert.equal(extractBearerTokenFromHeader(null), '')
})

OPENQASM 2.0;
include "qelib1.inc";
qreg q[3];
creg c[3];

h q[0];
h q[1];
h q[2];

// QAOA Layer 1
// Cost Hamiltonian evolution (gamma = gamma_0)
rz(2 * gamma_0 * 7.5) q[0];
rz(2 * gamma_0 * -2.5) q[1];
rz(2 * gamma_0 * -2.5) q[2];
cx q[0], q[1];
rz(2 * gamma_0 * 2.5) q[1];
cx q[0], q[1];
cx q[0], q[2];
rz(2 * gamma_0 * 2.5) q[2];
cx q[0], q[2];
cx q[1], q[2];
rz(2 * gamma_0 * 2.5) q[2];
cx q[1], q[2];
// Mixer Hamiltonian evolution (beta = beta_0)
rx(2 * beta_0) q[0];
rx(2 * beta_0) q[1];
rx(2 * beta_0) q[2];

// Measurements
measure q[0] -> c[0];
measure q[1] -> c[1];
measure q[2] -> c[2];
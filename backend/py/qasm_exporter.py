# OpenQASM exporter (templated, with QASM 3.0 qubit_count fix)

import re
from typing import Dict, Tuple, Any, List

class OpenQASMExporter:
    def __init__(self, version: str = "3.0"):
        assert version in ("2.0", "3.0")
        self.version = version

    def generate_qaoa_circuit(self, h_coeffs: Dict[int, float], J_coeffs: Dict[Tuple[int, int], float], num_layers: int = 2) -> str:
        n = (max(h_coeffs.keys()) + 1) if h_coeffs else 0
        header = []
        if self.version == "3.0":
            header.append("OPENQASM 3.0;")
            header.append('include "stdgates.inc";')
            header.append("")
            header.append("// QAOA circuit (templated)")
            header.append(f"// {n} qubits, {num_layers} layers")
            header.append(f"// Ising coefficients: {len(h_coeffs)} linear, {len(J_coeffs)} quadratic")
            header.append("")
            for l in range(num_layers):
                header.append(f"input float gamma_{l};")
                header.append(f"input float beta_{l};")
            header.append("")
            header.append(f"qubit[{n}] q;")
            header.append(f"bit[{n}] c;")
            header.append("")
        else:
            header.append("OPENQASM 2.0;")
            header.append('include "qelib1.inc";')
            header.append(f"qreg q[{n}];")
            header.append(f"creg c[{n}];")

        lin_items = [(i, h_coeffs[i]) for i in sorted(h_coeffs.keys())]
        quad_items = [((i, j), J_coeffs[(i, j)]) for (i, j) in sorted(J_coeffs.keys())]

        body: List[str] = []
        for i in range(n):
            body.append(f"h q[{i}];")

        for l in range(num_layers):
            body.append("")
            body.append(f"// QAOA Layer {l+1}")
            body.append(f"// Cost Hamiltonian evolution (gamma = gamma_{l})")
            for i, hi in lin_items:
                body.append(f"rz(2 * gamma_{l} * {hi}) q[{i}];")
            for (i, j), Jij in quad_items:
                body.append(f"cx q[{i}], q[{j}];")
                body.append(f"rz(2 * gamma_{l} * {Jij}) q[{j}];")
                body.append(f"cx q[{i}], q[{j}];")
            body.append(f"// Mixer Hamiltonian evolution (beta = beta_{l})")
            for i in range(n):
                body.append(f"rx(2 * beta_{l}) q[{i}];")

        body.append("")
        body.append("// Measurements")
        if self.version == "3.0":
            body.append("c = measure q;")
        else:
            for i in range(n):
                body.append(f"measure q[{i}] -> c[{i}];")

        return "\n".join(header + [""] + body)

    def get_circuit_info(self, qasm_code: str) -> Dict[str, Any]:
        info = {
            "version": self.version,
            "total_lines": qasm_code.count("\n") + 1,
            "gate_count": qasm_code.count(" h ") + qasm_code.count("\nrz(") + qasm_code.count("\ncx ") + qasm_code.count("\nrx("),
            "qubit_count": 0,
            "parameter_count": qasm_code.count("input float") if self.version == "3.0" else 0,
        }
        if self.version == "2.0":
            m = re.search(r"qreg q\[(\d+)\]", qasm_code)
            if m:
                info["qubit_count"] = int(m.group(1))
        else:
            m = re.search(r"qubit\[(\d+)\]\s+q", qasm_code)
            if m:
                info["qubit_count"] = int(m.group(1))
        return info

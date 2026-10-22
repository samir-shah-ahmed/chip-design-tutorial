module nand2(input a, input b, output y);
  assign y = ~(a & b);
endmodule

module xor2(
  input a,
  input b,
  output y
);
  wire n1, n2, n3;
  // TODO: XOR from four NAND2 cells. Do not use the ^ operator.
  assign y = 1'b0;
endmodule

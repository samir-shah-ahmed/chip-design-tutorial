module nand2(input a, input b, output y);
  assign y = ~(a & b);
endmodule

module xor2(
  input a,
  input b,
  output y
);
  wire n1, n2, n3;
  nand2 u1(.a(a), .b(b), .y(n1));
  nand2 u2(.a(a), .b(n1), .y(n2));
  nand2 u3(.a(n1), .b(b), .y(n3));
  nand2 u4(.a(n2), .b(n3), .y(y));
endmodule

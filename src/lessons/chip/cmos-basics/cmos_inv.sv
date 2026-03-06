module cmos_inv(input a, output y);
  // TODO: model a CMOS inverter
endmodule

module top;
  reg a;
  wire y;
  cmos_inv dut(.a(a), .y(y));
  initial begin
    // TODO: verify the truth table
    $finish;
  end
endmodule

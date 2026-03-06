module cmos_inv(input a, output y);
  assign y = ~a;
endmodule

module top;
  reg a;
  wire y;
  cmos_inv dut(.a(a), .y(y));
  initial begin
    a = 0; #1;
    $display("a=%b y=%b (expect y=1)", a, y);
    a = 1; #1;
    $display("a=%b y=%b (expect y=0)", a, y);
    $display("CMOS Inverter verified!");
    $finish;
  end
endmodule

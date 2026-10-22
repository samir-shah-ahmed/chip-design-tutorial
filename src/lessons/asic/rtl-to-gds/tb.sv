module tb;
reg [7:0] a, b;
  wire [7:0] y;
  alu_add dut(.a(a), .b(b), .y(y));
  initial begin
    a = 8'd40; b = 8'd2; #1;
    if (y === 8'd42) $display("PASS y=%0d", y);
    else $display("FAIL y=%0d", y);
    $finish;
  end
endmodule

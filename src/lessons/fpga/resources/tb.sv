module tb;
reg [7:0] a, b;
  wire [15:0] y;
  mac dut(.a(a), .b(b), .y(y));
  initial begin
    a = 8'd12; b = 8'd10; #1;
    if (y === 16'd120) $display("PASS y=%0d", y);
    else $display("FAIL y=%0d", y);
    $finish;
  end
endmodule

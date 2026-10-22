module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst, din;
  wire hit;
  seq101 dut(.clk(clk), .rst(rst), .din(din), .hit(hit));
  initial begin
    rst = 1; din = 0;
    repeat (2) @(posedge clk);
    @(negedge clk); rst = 0; din = 1;
    @(negedge clk); din = 0;
    @(negedge clk); din = 1;
    @(posedge clk); #1;
    if (hit === 1'b1) $display("PASS hit after 101");
    else $display("FAIL hit=%b after 101", hit);
    $finish;
  end
endmodule

module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst, din;
  wire dout;
  shift2 dut(.clk(clk), .rst(rst), .din(din), .dout(dout));
  initial begin
    rst = 1; din = 0;
    repeat (2) @(posedge clk);
    @(negedge clk); rst = 0; din = 1;
    @(posedge clk); #1;
    if (dout !== 0) begin $display("FAIL early"); $finish; end
    @(posedge clk); #1;
    if (dout === 1) $display("PASS delayed two clocks");
    else $display("FAIL dout=%b", dout);
    $finish;
  end
endmodule

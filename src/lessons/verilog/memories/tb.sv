module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg we, rst_unused;
  reg [2:0] addr;
  reg [3:0] wdata;
  wire [3:0] rdata;
  ram dut(.clk(clk), .we(we), .addr(addr), .wdata(wdata), .rdata(rdata));
  initial begin
    we = 0; addr = 0; wdata = 0;
    @(negedge clk);
    we = 1; addr = 3'd3; wdata = 4'hA;
    @(negedge clk);
    we = 0;
    @(posedge clk); #1;
    if (rdata === 4'hA) $display("PASS rdata=%h", rdata);
    else $display("FAIL rdata=%h expect a", rdata);
    $finish;
  end
endmodule
